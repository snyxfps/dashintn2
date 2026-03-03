// src/pages/DashboardGeral.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ServiceRecord, RecordStatus, STATUS_CONFIG, STATUS_OPTIONS } from "@/types";
import { AppHeader } from "@/components/AppHeader";
import { ServiceKPIs } from "@/pages/service/components/ServiceKPIs";
import { StatusBadge } from "@/components/StatusBadge";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, CalendarDays } from "lucide-react";
import { formatDateOnlyBR } from "@/lib/dateOnly";
import { ServiceRecordDetailsSheet } from "@/pages/service/components/ServiceRecordDetailsSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface OutletContext {
  onMenuClick: () => void;
}

const STATUS_COLORS: Record<RecordStatus, string> = {
  NOVO: "#94a3b8",
  REUNIAO: "#a78bfa",
  ANDAMENTO: "#3b82f6",
  FINALIZADO: "#22c55e",
  CANCELADO: "#ef4444",
  DEVOLVIDO: "#f97316",
};

type RecordWithService = ServiceRecord & { service_name?: string };

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

const toDateOnly = (v: string | null | undefined): Date | null => {
  const s = String(v || "").trim();
  if (!s) return null;
  const base = s.includes("T") ? s.split("T")[0] : s;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(base);
  if (!m) return null;
  const [, yyyy, mm, dd] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0, 0);
};

const toDateTime = (v: string | null | undefined): Date | null => {
  const s = String(v || "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const diffDays = (a: Date, b: Date) => (startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000;

const weekStart = (d: Date) => {
  const x = startOfDay(d);
  const day = x.getDay(); // 0..6 Sun..Sat
  const delta = (day + 6) % 7; // Monday=0
  x.setDate(x.getDate() - delta);
  return x;
};

const fmtWeek = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
};

// data "relevante" por status
const getEventDateForStatus = (r: ServiceRecord): Date | null => {
  if (r.status === "FINALIZADO" || r.status === "CANCELADO") return toDateOnly(r.end_date);
  if (r.status === "DEVOLVIDO") return toDateOnly(r.devolucao_date);
  if (r.status === "REUNIAO") return toDateTime(r.meeting_datetime);
  if (r.status === "NOVO") return toDateOnly(r.cadastro_date) || toDateOnly(r.start_date);
  return toDateOnly(r.start_date);
};

export default function DashboardGeral() {
  const markAuditSeen = (value: string | null) => {
    try {
      if (value) localStorage.setItem('lastAuditSeen', value);
    } catch { }
    setHasNewAudit(false);
  };
  const { onMenuClick } = useOutletContext<OutletContext>();

  const [records, setRecords] = useState<RecordWithService[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastAuditAt, setLastAuditAt] = useState<string | null>(null);
  const [hasNewAudit, setHasNewAudit] = useState(false);

  // filtros
  const [filterService, setFilterService] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<RecordStatus | "ALL">("ALL");
  const [filterOwner, setFilterOwner] = useState<string>("ALL");

  // filtro de data (date input trabalha com YYYY-MM-DD)
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");

  // Detalhes do registro
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null);

  const openDetails = (r: ServiceRecord) => {
    setSelectedRecord(r);
    setDetailsOpen(true);
  };

  const fetchAll = async () => {
    try {
      setLoading(true);

      const { data: servicesData, error: servicesErr } = await supabase.from("services").select("id,name");
      if (servicesErr) {
        console.error(servicesErr);
        return;
      }

      const serviceMap = new Map<string, string>();
      (servicesData || []).forEach((s: any) => serviceMap.set(String(s.id), String(s.name)));

      const { data: recs, error: recErr } = await supabase.from("records").select("*").order("created_at", { ascending: false });

      if (recErr) {
        console.error(recErr);
        return;
      }

      const enriched: RecordWithService[] = ((recs as ServiceRecord[]) || []).map((r) => ({
        ...r,
        service_name: serviceMap.get(String(r.service_id)) || "—",
      }));

      // última atualização via auditoria
      const { data: auditData, error: auditErr } = await (supabase as any)
        .from("record_audit_logs")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1);

      if (auditErr) {
        console.error(auditErr);
        setLastAuditAt(null);
      } else {
        setLastAuditAt((auditData as any)?.[0]?.created_at ?? null);
      }
      setRecords(enriched);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const services = useMemo(() => {
    const unique = [...new Set(records.map((r) => r.service_name).filter(Boolean))] as string[];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [records]);

  const owners = useMemo(() => {
    const unique = [...new Set(records.map((r) => (r.owner || "").trim()).filter(Boolean))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [records]);

  const today = useMemo(() => startOfDay(new Date()), []);

  // parsed dates do filtro (startOfDay pra comparar certinho)
  const dateFrom = useMemo(() => (filterDateFrom ? startOfDay(new Date(filterDateFrom)) : null), [filterDateFrom]);
  const dateTo = useMemo(() => (filterDateTo ? startOfDay(new Date(filterDateTo)) : null), [filterDateTo]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const okService = filterService === "ALL" || (r.service_name || "—") === filterService;
      const okStatus = filterStatus === "ALL" || r.status === filterStatus;

      const ownerTrim = (r.owner || "").trim();
      const okOwner = filterOwner === "ALL" || ownerTrim === filterOwner;

      const ev = getEventDateForStatus(r);
      let okDate = true;

      if (dateFrom || dateTo) {
        if (!ev) {
          okDate = false;
        } else {
          const evDay = startOfDay(ev);
          const evTime = evDay.getTime();

          if (dateFrom && evTime < dateFrom.getTime()) okDate = false;
          if (dateTo && evTime > dateTo.getTime()) okDate = false;
        }
      }

      return okService && okStatus && okOwner && okDate;
    });
  }, [records, filterService, filterStatus, filterOwner, dateFrom, dateTo]);

  // Check for new audits
  useEffect(() => {
    if (lastAuditAt) {
      const lastSeen = localStorage.getItem('lastAuditSeen');
      if (lastSeen !== lastAuditAt) {
        setHasNewAudit(true);
      }
    }
  }, [lastAuditAt]);

  // ============
  // GRÁFICO 1: Distribuição por status
  // ============
  const statusDist = useMemo(() => {
    const totalByStatus: Record<string, number> = {};
    for (const r of filtered) totalByStatus[r.status] = (totalByStatus[r.status] || 0) + 1;

    return STATUS_OPTIONS.map((s) => ({
      status: s,
      name: STATUS_CONFIG[s].label,
      count: totalByStatus[s] || 0,
      color: STATUS_COLORS[s],
    }));
  }, [filtered]);

  // ============
  // GRÁFICO 2: Throughput semanal (últimas 12 semanas)
  // ============
  const throughputWeekly = useMemo(() => {
    const rows: Record<string, any> = {};

    for (const r of filtered) {
      if (!["FINALIZADO", "CANCELADO", "DEVOLVIDO"].includes(r.status)) continue;
      const d = getEventDateForStatus(r);
      if (!d) continue;

      const ws = weekStart(d);
      const key = ws.toISOString().slice(0, 10);

      if (!rows[key]) rows[key] = { key, week: fmtWeek(ws), FINALIZADO: 0, CANCELADO: 0, DEVOLVIDO: 0 };
      rows[key][r.status] += 1;
    }

    return Object.values(rows).sort((a: any, b: any) => (a.key > b.key ? 1 : -1)).slice(-12);
  }, [filtered]);

  // ============
  // GRÁFICO 3: Aging buckets (abertos)
  // ============
  const agingBuckets = useMemo(() => {
    const open = filtered.filter((r) => ["NOVO", "REUNIAO", "ANDAMENTO"].includes(r.status));
    const buckets = [
      { bucket: "0–15", from: 0, to: 15, count: 0 },
      { bucket: "15–25", from: 15, to: 25, count: 0 },
      { bucket: "25–45", from: 25, to: 45, count: 0 },
      { bucket: "45+", from: 45, to: 10_000, count: 0 },
    ];

    for (const r of open) {
      const start = toDateOnly(r.start_date);
      if (!start) continue;
      const age = Math.max(0, diffDays(today, start));
      const b = buckets.find((x) => age >= x.from && age < x.to);
      if (b) b.count += 1;
    }

    return buckets;
  }, [filtered, today]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gradient-to-b from-muted/30 to-background">
      <AppHeader
        title="Dashboard (Geral)"
        subtitle="3 gráficos essenciais + lista"
        onMenuClick={onMenuClick}
        actions={
          <div className="flex items-center gap-3">
            {hasNewAudit && (
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" title="Novas atualizações disponíveis" />
            )}
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              Atualizado em: {lastAuditAt ? new Date(lastAuditAt).toLocaleDateString("pt-BR") : "—"}
            </div>
            {hasNewAudit && (
              <button
                onClick={() => markAuditSeen(lastAuditAt)}
                className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-2 py-0.5 rounded transition-colors"
              >
                Marcar como lido
              </button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <ServiceKPIs records={filtered as any} loading={loading} />

            {/* filtros */}
            <div className="corp-card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Filter className="w-4 h-4 text-muted-foreground" />

                <Select value={filterService} onValueChange={setFilterService}>
                  <SelectTrigger className="h-8 w-52 text-xs">
                    <SelectValue placeholder="Serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os serviços</SelectItem>
                    {services.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os status</SelectItem>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_CONFIG[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterOwner} onValueChange={setFilterOwner}>
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue placeholder="Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    {owners.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* filtro de data */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-md border px-2 h-8">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="bg-transparent text-xs outline-none"
                      aria-label="Data início"
                    />
                  </div>

                  <span className="text-xs text-muted-foreground">até</span>

                  <div className="flex items-center gap-2 rounded-md border px-2 h-8">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="bg-transparent text-xs outline-none"
                      aria-label="Data fim"
                    />
                  </div>
                </div>

                <div className="ml-auto text-xs text-muted-foreground">{filtered.length} registros</div>
              </div>
            </div>

            {/* 3 gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1) Composição de Status (Donut Chart) */}
              <div className="corp-card p-6 flex flex-col h-[400px]">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-foreground">Composição de Status</h3>
                  <p className="text-xs text-muted-foreground">Visão percentual do que está em cada etapa agora.</p>
                </div>

                <div className="flex-1 min-h-0 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDist.filter(d => d.count > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="count"
                        animationDuration={800}
                      >
                        {statusDist.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        formatter={(value) => <span className="text-xs font-medium text-muted-foreground lowercase first-letter:uppercase">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-10">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">{filtered.length}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2) Tendência de Entregas (Throughput) */}
              <div className="corp-card p-6 h-[400px]">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-foreground">Volume de Conclusão</h3>
                  <p className="text-xs text-muted-foreground">Evolução de entregas finalizadas x devolvidas nas últimas semanas.</p>
                </div>

                <ResponsiveContainer width="100%" height="80%">
                  <AreaChart data={throughputWeekly}>
                    <defs>
                      <linearGradient id="colorFinalizado" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={STATUS_COLORS.FINALIZADO} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={STATUS_COLORS.FINALIZADO} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorDevolvido" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={STATUS_COLORS.DEVOLVIDO} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={STATUS_COLORS.DEVOLVIDO} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis
                      dataKey="week"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="rect" />
                    <Area
                      type="monotone"
                      dataKey="FINALIZADO"
                      name="Finalizados"
                      stroke={STATUS_COLORS.FINALIZADO}
                      fillOpacity={1}
                      fill="url(#colorFinalizado)"
                      strokeWidth={3}
                      animationDuration={1000}
                    />
                    <Area
                      type="monotone"
                      dataKey="DEVOLVIDO"
                      name="Devolvidos"
                      stroke={STATUS_COLORS.DEVOLVIDO}
                      fillOpacity={1}
                      fill="url(#colorDevolvido)"
                      strokeWidth={3}
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* 3) Análise de Aging (Saúde do Fluxo) */}
              <div className="corp-card p-6 xl:col-span-2">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-foreground">Tempo de Permanência (Aging)</h3>
                  <p className="text-xs text-muted-foreground">Há quanto tempo os cards ativos estão parados. Cards acima de 25 dias exigem atenção.</p>
                </div>

                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={agingBuckets} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis
                      dataKey="bucket"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fontWeight: 500, fill: "hsl(var(--foreground))" }}
                      label={{ value: 'Dias decorridos', position: 'insideBottom', offset: -5, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar
                      dataKey="count"
                      name="Cards Ativos"
                      radius={[8, 8, 0, 0]}
                      animationDuration={800}
                    >
                      {agingBuckets.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index === 0 ? '#10b981' :
                              index === 1 ? '#3b82f6' :
                                index === 2 ? '#f59e0b' : '#ef4444'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* lista */}
            <div className="corp-card overflow-hidden anim-fade-up">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Registros (lista)</h3>
                <div className="text-xs text-muted-foreground">Mostrando os últimos registros do filtro.</div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Serviço</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3">Cliente</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3">Status</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 hidden sm:table-cell">Owner</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 hidden md:table-cell">Início</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.slice(0, 50).map((r) => (
                      <tr
                        key={r.id}
                        className="table-row-hover cursor-pointer"
                        onClick={() => openDetails(r)}
                      >
                        <td className="px-5 py-3 text-xs text-muted-foreground">{r.service_name}</td>
                        <td className="px-3 py-3 font-medium text-foreground">{r.client_name}</td>
                        <td className="px-3 py-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-3 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                          {(r.owner || "").trim() || "-"}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground text-xs hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="w-3 h-3" />
                            {formatDateOnlyBR(r.start_date)}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-14 text-center">
                          <div className="text-sm font-medium text-foreground">
                            Nenhum registro corresponde aos filtros selecionados
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Tente ampliar o período, remover filtros ou selecionar outro serviço.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <ServiceRecordDetailsSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        record={selectedRecord}
        isAdmin={isAdmin}
        onEdit={(r) => {
          const pathMap: Record<string, string> = {
            'SMP': '/smp',
            'Multicadastro': '/multicadastro',
            'RC-V': '/rcv',
            'Tecnologia Logística': '/tecnologia-logistica',
            'Tecnologia Risco': '/tecnologia-risco'
          };
          const svcName = (r as any).service_name || (selectedRecord as any)?.service_name;
          const path = pathMap[svcName];
          if (path) {
            navigate(path);
          } else {
            toast.error("Serviço não identificado para edição.");
          }
        }}
        onAskDelete={() => {
          toast.info("A exclusão deve ser feita na página específica do serviço.");
        }}
      />
    </div>
  );
}
