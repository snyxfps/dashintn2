import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type AuditLogRow = {
  id: string;
  record_id: string;
  user_id: string | null;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
};

export function ServiceAuditLog({ recordId }: { recordId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit", recordId],
    enabled: !!recordId,
    queryFn: async () => {
      // cast por causa de tipagem do supabase (se types não foram regenerados)
      const sb: any = supabase;

      const { data, error } = await sb
        .from("record_audit_logs")
        .select("*")
        .eq("record_id", recordId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as AuditLogRow[];
    },
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando histórico…</div>;
  if (isError) return <div className="text-sm text-destructive">Erro ao carregar histórico.</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground">Sem histórico ainda.</div>;

  return (
    <div className="space-y-2">
      {data.map((log) => (
        <div key={log.id} className="rounded-lg border p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium">{log.action}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(log.created_at).toLocaleString()}
            </div>
          </div>

          {log.field_name ? (
            <div className="mt-1 text-muted-foreground">
              {log.field_name}: <span className="font-medium">{log.old_value ?? "—"}</span> →{" "}
              <span className="font-medium">{log.new_value ?? "—"}</span>
            </div>
          ) : null}

          {log.user_id ? (
            <div className="mt-1 text-xs text-muted-foreground">user_id: {log.user_id}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}