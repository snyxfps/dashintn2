-- 1) Novo serviço: Tecnologia Risco
INSERT INTO public.services (name, description)
VALUES ('Tecnologia Risco', 'Soluções de Tecnologia para Risco')
ON CONFLICT (name) DO NOTHING;

-- 2) Campos adicionais na tabela records (por status/serviço)
ALTER TABLE public.records
  ADD COLUMN IF NOT EXISTS agidesk_ticket TEXT,
  ADD COLUMN IF NOT EXISTS cadastro_date DATE,
  ADD COLUMN IF NOT EXISTS meeting_datetime TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS integration_type TEXT,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS devolucao_date DATE,
  ADD COLUMN IF NOT EXISTS commercial TEXT;

-- 3) Regras de negócio no banco (defesa em profundidade):
--    - NOVO e REUNIAO somente para o serviço RC-V
--    - Campos obrigatórios por status
CREATE OR REPLACE FUNCTION public.validate_record_business_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  svc_name TEXT;
BEGIN
  SELECT name INTO svc_name FROM public.services WHERE id = NEW.service_id;

  -- NOVO e REUNIAO só no RC-V
  IF NEW.status IN ('NOVO','REUNIAO') AND svc_name IS DISTINCT FROM 'RC-V' THEN
    RAISE EXCEPTION 'Status % só é permitido no serviço RC-V', NEW.status;
  END IF;

  -- Campos obrigatórios por status
  IF NEW.status = 'NOVO' THEN
    IF NEW.client_name IS NULL OR btrim(NEW.client_name) = '' THEN
      RAISE EXCEPTION 'Cliente é obrigatório para NOVO';
    END IF;
    IF NEW.agidesk_ticket IS NULL OR btrim(NEW.agidesk_ticket) = '' THEN
      RAISE EXCEPTION 'Chamado Agidesk é obrigatório para NOVO';
    END IF;
    IF NEW.cadastro_date IS NULL THEN
      RAISE EXCEPTION 'Data de Cadastro é obrigatória para NOVO';
    END IF;
    -- start_date como fallback para relatórios/ordenação
    NEW.start_date := COALESCE(NEW.start_date, NEW.cadastro_date);
  ELSIF NEW.status = 'REUNIAO' THEN
    IF NEW.meeting_datetime IS NULL THEN
      RAISE EXCEPTION 'Data/hora reunião é obrigatória para REUNIAO';
    END IF;
    NEW.start_date := COALESCE(NEW.start_date, (NEW.meeting_datetime AT TIME ZONE 'UTC')::date);
  ELSIF NEW.status = 'ANDAMENTO' THEN
    IF NEW.start_date IS NULL THEN
      RAISE EXCEPTION 'Data início é obrigatória para ANDAMENTO';
    END IF;
    IF svc_name = 'RC-V' AND (NEW.integration_type IS NULL OR btrim(NEW.integration_type) = '') THEN
      RAISE EXCEPTION 'Tipo de Integração é obrigatório para ANDAMENTO (RC-V)';
    END IF;
  ELSIF NEW.status IN ('FINALIZADO','CANCELADO') THEN
    IF NEW.start_date IS NULL THEN
      RAISE EXCEPTION 'Data início é obrigatória para %', NEW.status;
    END IF;
    IF NEW.end_date IS NULL THEN
      RAISE EXCEPTION 'Data fim é obrigatória para %', NEW.status;
    END IF;
    IF svc_name = 'RC-V' AND (NEW.integration_type IS NULL OR btrim(NEW.integration_type) = '') THEN
      RAISE EXCEPTION 'Tipo de Integração é obrigatório para % (RC-V)', NEW.status;
    END IF;
  ELSIF NEW.status = 'DEVOLVIDO' THEN
    IF NEW.devolucao_date IS NULL THEN
      RAISE EXCEPTION 'Data da devolução é obrigatória para DEVOLVIDO';
    END IF;
    IF NEW.commercial IS NULL OR btrim(NEW.commercial) = '' THEN
      RAISE EXCEPTION 'Comercial é obrigatório para DEVOLVIDO';
    END IF;
    NEW.start_date := COALESCE(NEW.start_date, NEW.devolucao_date);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_record_business_rules ON public.records;
CREATE TRIGGER trg_validate_record_business_rules
BEFORE INSERT OR UPDATE ON public.records
FOR EACH ROW EXECUTE FUNCTION public.validate_record_business_rules();

-- 4) Índices úteis (opcional, mas recomendado)
CREATE INDEX IF NOT EXISTS idx_records_status ON public.records(status);
CREATE INDEX IF NOT EXISTS idx_records_service_status ON public.records(service_id, status);
CREATE INDEX IF NOT EXISTS idx_records_client_name ON public.records(client_name);
