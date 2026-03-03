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
import { Button } from "@/components/ui/button";
import { Download, History as HistoryIcon } from "lucide-react";

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
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
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

  const [filterService, setFilterService] = useState<string>("ALL");
  const [filterAction, setFilterAction] = useState<AuditAction | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<RecordStatus | "ALL">("ALL");
  const [searchClient, setSearchClient] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const sb: any = supabase;

      const { data: svcData, error: svcErr } = await sb.from("services").select("id,name");
      if (svcErr) throw svcErr;
      const svcMap: Record<string, string> = {};
      (svcData ?? []).forEach((s: ServiceMini) => (svcMap[String(s.id)] = String(s.name)));
      setServicesById(svcMap);

      const { data: auditData, error: auditErr } = await sb
        .from("record_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (auditErr) throw auditErr;

      const rows = (auditData ?? []) as AuditRow[];
      setLogs(rows);

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
      <AppHeader title="Auditoria" subtitle="Histórico de alterações (Log Global)" onMenuClick={onMenuClick} />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5">
        {/* filtros */}
        <div className="corp-card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Serviço</Label>
              <Select value={filterService} onValueChange={setFilterService}>
                <SelectTrigger className="h-9 truncate">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {servicesList.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "ALL" ? "Todos os Serviços" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Ação</Label>
              <Select value={filterAction} onValueChange={(v) => setFilterAction(v as any)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as Ações</SelectItem>
                  <SelectItem value="STATUS_CHANGE">Alteração de Status</SelectItem>
                  <SelectItem value="CREATE">Criação</SelectItem>
                  <SelectItem value="UPDATE">Edição</SelectItem>
                  <SelectItem value="DELETE">Exclusão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Status Atual</Label>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Qualquer Status</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_CONFIG[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:col-span-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Filtrar Cliente</Label>
              <Input placeholder="Digitar nome do cliente..." value={searchClient} onChange={(e) => setSearchClient(e.target.value)} className="h-9" />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 border-t pt-4">
            <div className="text-xs text-muted-foreground">
              Mostrando <span className="font-bold text-foreground">{filtered.length}</span> registros recentes
            </div>
            <Button variant="outline" size="sm" onClick={() => downloadCsv(exportRows as any, `auditoria-${new Date().toISOString().slice(0, 10)}`)} className="h-8 text-xs">
              <Download className="h-3 w-3 mr-2 text-blue-500" />
              Exportar para Planilha
            </Button>
          </div>
        </div>

        {/* tabela */}
        <div className="corp-card overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-4">
                  <div className="h-10 w-32 shimmer-skeleton rounded-lg" />
                  <div className="h-10 w-full shimmer-skeleton rounded-lg" />
                  <div className="h-10 w-24 shimmer-skeleton rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="py-4 font-bold text-foreground h-12">Quando</TableHead>
                    <TableHead className="py-4 font-bold text-foreground h-12">Serviço / Cliente</TableHead>
                    <TableHead className="py-4 font-bold text-foreground text-center h-12">Evento</TableHead>
                    <TableHead className="py-4 font-bold text-foreground text-center h-12">Campo</TableHead>
                    <TableHead className="py-4 font-bold text-foreground h-12">Mudança (De → Para)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l) => {
                    const rec = recordsById[String(l.record_id)];
                    const serviceName = rec?.service_id ? servicesById[String(rec.service_id)] : "—";

                    const actionConfig: Record<AuditAction, { label: string, style: string }> = {
                      CREATE: { label: "Criação", style: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
                      UPDATE: { label: "Edição", style: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
                      DELETE: { label: "Exclusão", style: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
                      STATUS_CHANGE: { label: "Status", style: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
                    };

                    const action = actionConfig[l.action] || { label: l.action, style: "bg-muted text-muted-foreground" };

                    return (
                      <TableRow key={l.id} className="group transition-colors hover:bg-muted/30 border-b border-border/40">
                        <TableCell className="whitespace-nowrap py-4">
                          <div className="text-sm font-semibold">{new Date(l.created_at).toLocaleDateString()}</div>
                          <div className="text-[10px] font-medium text-muted-foreground uppercase">{new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="text-[10px] font-black text-blue-500 uppercase tracking-tighter">{serviceName}</div>
                          <div className="text-sm font-bold truncate max-w-[280px] text-foreground">{rec?.client_name ?? "—"}</div>
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <div className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-widest ${action.style}`}>
                            {action.label}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <span className="text-[10px] font-mono font-bold bg-muted/50 px-2 py-1 rounded border border-border/50 text-muted-foreground">
                            {l.field_name ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground truncate max-w-[150px] italic">{l.old_value ?? "vazio"}</span>
                            <span className="text-muted-foreground/40 font-light">→</span>
                            <span className="text-xs font-bold truncate max-w-[150px] text-foreground">{l.new_value ?? "—"}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-24 bg-muted/5">
                        <div className="flex flex-col items-center gap-3 opacity-30">
                          <HistoryIcon className="h-12 w-12" />
                          <div className="space-y-1">
                            <p className="font-bold text-lg">Sua busca não retornou nada</p>
                            <p className="text-xs">Tente remover filtros ou usar termos mais genéricos.</p>
                          </div>
                        </div>
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
