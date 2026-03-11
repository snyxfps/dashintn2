
-- 1) Tabela de Auditoria (Estrutura Firme)
CREATE TABLE IF NOT EXISTS public.record_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,
    user_id UUID, -- Referência ao auth.uid() de quem fez a alteração
    action TEXT NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2) Habilitar RLS e Blindar contra modificações externas
ALTER TABLE public.record_audit_logs ENABLE ROW LEVEL SECURITY;

-- Hardening: Ninguém (nem admin no app) pode alterar ou apagar logs.
-- A leitura é liberada para logs de auditoria consultarem o histórico.
CREATE POLICY "Enable select for authenticated users" 
ON public.record_audit_logs FOR SELECT TO authenticated USING (true);

-- IMPORTANTE: Não há políticas de INSERT/UPDATE/DELETE para usuários.
-- O insert será feito via TRIGGER com SECURITY DEFINER (bypass RLS).

-- 3) Função de Auditoria Automática (O "Cérebro" Antihacker)
CREATE OR REPLACE FUNCTION public.fn_audit_record_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Permite inserir log mesmo que o usuário não tenha permissão na tabela
SET search_path = public
AS $$
DECLARE
    curr_user_id UUID := auth.uid();
    audit_action TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        audit_action := 'CREATE';
        INSERT INTO public.record_audit_logs (record_id, user_id, action, new_value)
        VALUES (NEW.id, curr_user_id, audit_action, 'Registro criado');
    
    ELSIF (TG_OP = 'UPDATE') THEN
        audit_action := 'UPDATE';
        
        -- Auditoria de Status (Especial)
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.record_audit_logs (record_id, user_id, action, field_name, old_value, new_value)
            VALUES (NEW.id, curr_user_id, 'STATUS_CHANGE', 'status', OLD.status::text, NEW.status::text);
        END IF;

        -- Auditoria de Cliente
        IF OLD.client_name IS DISTINCT FROM NEW.client_name THEN
            INSERT INTO public.record_audit_logs (record_id, user_id, action, field_name, old_value, new_value)
            VALUES (NEW.id, curr_user_id, 'UPDATE', 'client_name', OLD.client_name, NEW.client_name);
        END IF;

        -- Auditoria de Notas
        IF OLD.notes IS DISTINCT FROM NEW.notes THEN
            INSERT INTO public.record_audit_logs (record_id, user_id, action, field_name, old_value, new_value)
            VALUES (NEW.id, curr_user_id, 'UPDATE', 'notes', OLD.notes, NEW.notes);
        END IF;

    ELSIF (TG_OP = 'DELETE') THEN
        -- No DELETE o record_id vai sumir (CASCADE), mas guardamos a info antes
        -- Obs: Como a FK tem ON DELETE CASCADE, os logs somem se o registro sumir.
        -- Se preferir manter os logs mesmo após deletar, mude a FK para SET NULL.
        NULL; 
    END IF;

    RETURN NEW;
END;
$$;

-- 4) Ativar a Trigger na tabela de Records
DROP TRIGGER IF EXISTS trg_audit_records ON public.records;
CREATE TRIGGER trg_audit_records
AFTER INSERT OR UPDATE ON public.records
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_record_changes();

-- 5) Ajuste na tabela user_roles para segurança máxima
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles" 
ON public.user_roles 
FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 6) Índices táticos
CREATE INDEX IF NOT EXISTS idx_audit_created_at_desc ON public.record_audit_logs(created_at DESC);

COMMENT ON TABLE public.record_audit_logs IS 'Logs gerados automaticamente via Trigger. Blindado contra inserções manuais falsas.';
