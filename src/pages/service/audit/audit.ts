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

export async function writeAuditLog(params: WriteAuditParams): Promise<void> {
  try {
    // Cast do client e do nome da tabela para escapar do typing desatualizado do Supabase
    const sb: any = supabase;

    const { error } = await sb.from("record_audit_logs").insert({
      record_id: params.recordId,
      user_id: params.userId ?? null,
      action: params.action,
      field_name: params.fieldName ?? null,
      old_value: params.oldValue != null ? String(params.oldValue) : null,
      new_value: params.newValue != null ? String(params.newValue) : null,
    });

    if (error) console.error("Audit log insert error:", error);
  } catch (err) {
    // Auditoria NUNCA pode quebrar o app
    console.error("Unexpected audit error:", err);
  }
}