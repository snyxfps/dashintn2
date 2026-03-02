import { supabase } from "@/integrations/supabase/client";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE";

interface WriteAuditParams {
  recordId: string;
  userId?: string | null;
  action: AuditAction;
  fieldName?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Auditoria agora é feita 100% no BACKEND via TRIGGER (records -> record_audit_logs).
 * Por segurança (RLS), o client NÃO tem permissão de INSERT na tabela de logs.
 *
 * Mantemos esta função como "noop" para não quebrar imports/calls existentes.
 */
export async function writeAuditLog(_params: WriteAuditParams): Promise<void> {
  // NO-OP: logs são gravados no banco via trigger
  return;
}

/**
 * (Opcional) helper para debug: checar se o usuário consegue ler logs.
 * Você pode remover se não usar.
 */
export async function canReadAuditLogs(): Promise<boolean> {
  try {
    const sb: any = supabase;
    const { data, error } = await sb.from("record_audit_logs").select("id").limit(1);
    if (error) return false;
    return Array.isArray(data);
  } catch {
    return false;
  }
}