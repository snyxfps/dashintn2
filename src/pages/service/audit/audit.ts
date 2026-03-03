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

type AuditInsertRow = {
  record_id: string;
  user_id: string | null;
  action: AuditAction;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
};

function toNullableString(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export async function writeAuditLog(params: WriteAuditParams): Promise<void> {
  try {
    const payload: AuditInsertRow = {
      record_id: params.recordId,
      user_id: params.userId ?? null,
      action: params.action,
      field_name: params.fieldName ?? null,
      old_value: toNullableString(params.oldValue),
      new_value: toNullableString(params.newValue),
    };

    const { error } = await (supabase as any).from("record_audit_logs").insert(payload);

    if (error) {
      console.error("Audit log insert error:", error);
    }
  } catch (err) {
    // Auditoria NUNCA pode quebrar o app
    console.error("Unexpected audit error:", err);
  }
}