import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { RecordStatus } from "@/types";
import { STATUS_CONFIG, STATUS_OPTIONS } from "@/types";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface OutletContext {
  onMenuClick: () => void;
}

type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE";

type AuditRow = {
  id: string;
  record_id: string;
  user_id: string | null;
  action: AuditAction;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
};

type RecordMini = {
  id: string;
  client_name: string | null;
  service_id: string | null;
  status: RecordStatus;
};

type ServiceMini = { id: string; name: string };

function downloadCsv(rows: Record<string, any>[], fileBaseName: string) {
  if (!rows || rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };

  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(",")),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileBaseName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditoriaPage() {
  const { onMenuClick } = useOutletContext<OutletContext>();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [recordsById, setRecordsById] = useState<Record<string, RecordMini>>({});
  const [servicesById, setServicesById] = useState<Record<string, string>>({});

  // filtros simples
  const [filterService, setFilterService] = useState<string>("ALL");
  const [filterAction, setFilterAction] = useState<AuditAction | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<RecordStatus | "ALL">("ALL");
  const [searchClient, setSearchClient] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const sb: any = supabase;

      // 1) services map
      const { data: svcData, error: svcErr } = await sb.from("services").select("id,name");
      if (svcErr) throw svcErr;
      const svcMap: Record<string, string> = {};
      (svcData ?? []).forEach((s: ServiceMini) => (svcMap[String(s.id)] = String(s.name)));
      setServicesById(svcMap);

      // 2) audit logs (recent first)
      const { data: auditData, error: auditErr } = await sb
        .from("record_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (auditErr) throw auditErr;

      const rows = (auditData ?? []) as AuditRow[];
      setLogs(rows);

      // 3) fetch records referenced by logs (batch IN)
      const ids = Array.from(new Set(rows.map((r) => String(r.record_id)).filter(Boolean)));
      if (ids.length === 0) {
        setRecordsById({});
        return;
      }

      const { data: recData, error: recErr } = await sb
        .from("records")
        .select("id,client_name,service_id,status")
        .in("id", ids);

      if (recErr) throw recErr;

      const recMap: Record<string, RecordMini> = {};
      (recData ?? []).forEach((r: RecordMini) => (recMap[String(r.id)] = r));
      setRecordsById(recMap);
    } catch (e) {
      console.error(e);
      setLogs([]);
      setRecordsById({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const servicesList = useMemo(() => {
    const names = Object.values(servicesById);
    return ["ALL", ...Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))];
  }, [servicesById]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const rec = recordsById[String(l.record_id)];
      const serviceName = rec?.service_id ? servicesById[String(rec.service_id)] : undefined;

      const okService = filterService === "ALL" || serviceName === filterService;
      const okAction = filterAction === "ALL" || l.action === filterAction;
      const okStatus = filterStatus === "ALL" || rec?.status === filterStatus;

      const client = (rec?.client_name ?? "").toLowerCase();
      const okClient = !searchClient || client.includes(searchClient.toLowerCase());

      return okService && okAction && okStatus && okClient;
    });
  }, [logs, recordsById, servicesById, filterService, filterAction, filterStatus, searchClient]);

  const exportRows = useMemo(() => {
    return filtered.map((l) => {
      const rec = recordsById[String(l.record_id)];
      const serviceName = rec?.service_id ? servicesById[String(rec.service_id)] : "—";
      return {
        created_at: l.created_at,
        service: serviceName,
        client_name: rec?.client_name ?? "—",
        action: l.action,
        field: l.field_name ?? "—",
        old: l.old_value ?? "—",
        new: l.new_value ?? "—",
        user_id: l.user_id ?? "—",
      };
    });
  }, [filtered, recordsById, servicesById]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AppHeader title="Auditoria" subtitle="Histórico de alterações (Status/CRUD)" onMenuClick={onMenuClick} />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5">
        {/* filtros */}
        <div className="corp-card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label>Serviço</Label>
              <Select value={filterService} onValueChange={setFilterService}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {servicesList.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "ALL" ? "Todos" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Ação</Label>
              <Select value={filterAction} onValueChange={(v) => setFilterAction(v as any)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  <SelectItem value="STATUS_CHANGE">Status</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Status atual</Label>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_CONFIG[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-2">
              <Label>Cliente</Label>
              <Input placeholder="Buscar por cliente..." value={searchClient} onChange={(e) => setSearchClient(e.target.value)} />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadCsv(exportRows as any, `auditoria-${new Date().toISOString().slice(0,10)}`)}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* tabela */}
        <div className="corp-card p-4">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Campo</TableHead>
                    <TableHead>De</TableHead>
                    <TableHead>Para</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l) => {
                    const rec = recordsById[String(l.record_id)];
                    const serviceName = rec?.service_id ? servicesById[String(rec.service_id)] : "—";
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</TableCell>
                        <TableCell className="whitespace-nowrap">{serviceName}</TableCell>
                        <TableCell className="min-w-[220px]">{rec?.client_name ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{l.action}</TableCell>
                        <TableCell className="whitespace-nowrap">{l.field_name ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{l.old_value ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{l.new_value ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                        Nenhum registro encontrado com os filtros atuais.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
