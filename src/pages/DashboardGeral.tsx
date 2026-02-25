// src/pages/DashboardGeral.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ServiceRecord, RecordStatus, STATUS_CONFIG, STATUS_OPTIONS } from "@/types";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, BarChart3, EyeOff, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateOnlyBR } from "@/lib/dateOnly";

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

const getEventDateForStatus = (r: ServiceRecord): Date | null => {
  if (r.status === "FINALIZADO" || r.status === "CANCELADO") return toDateOnly(r.end_date);
  if (r.status === "DEVOLVIDO") return toDateOnly(r.devolucao_date);
  if (r.status === "REUNIAO") return toDateTime(r.meeting_datetime);
  if (r.status === "NOVO") return toDateOnly(r.cadastro_date) || toDateOnly(r.start_date);
  return toDateOnly(r.start_date);
};

export default function DashboardGeral() {
  const { onMenuClick } = useOutletContext<OutletContext>();

  const [records, setRecords] = useState<RecordWithService[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros globais
  const [filterService, setFilterService] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<RecordStatus | "ALL">("ALL");
  const [filterOwner, setFilterOwner] = useState<string>("ALL");

  // ✅ melhor UX: abre com leitura simples, gráficos como detalhe
  const [showCharts, setShowCharts] = useState(false);

  const fetchAll = async () => {
    setLoading(true);

    // 1) services (id->name)
    const { data: servicesData, error: servicesErr } = await supabase.from("services").select("id,name");
    if (servicesErr) {
      console.error(servicesErr);
      setLoading(false);
      return;
    }

    const serviceMap = new Map<string, string>();
    (servicesData || []).forEach((s: any) => serviceMap.set(String(s.id), String(s.name)));

    // 2) records (todos)
    const { data: recs, error: recErr } = await supabase
      .from("records")
      .select("*")
      .order("created_at", { ascending: false });

    if (recErr) {
      console.error(recErr);
      setLoading(false);
      return;
    }

    const enriched: RecordWithService[] = ((recs as ServiceRecord[]) || []).map((r) => ({
      ...r,
      service_name: serviceMap.get(String(r.service_id)) || "—",
    }));

    setRecords(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const services = useMemo(() => {
    const unique = [...new Set(records.map((r) => r.service_name).filter(Boolean))] as string[];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [records]);

  // ✅ garante que o filtro por owner funcione com os mesmos valores do select
  const owners = useMemo(() => {
    const unique = [...new Set(records.map((r) => (r.owner || "").trim()).filter(Boolean))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const okService = filterService === "ALL" || (r.service_name || "—") === filterService;
      const okStatus = filterStatus === "ALL" || r.status === filterStatus;

      // ⚠️ correção: comparar com owner "trimado", igual ao select
      const ownerTrim = (r.owner || "").trim();
      const okOwner = filterOwner === "ALL" || ownerTrim === filterOwner;

      return okService && okStatus && okOwner;
    });
  }, [records, filterService, filterStatus, filterOwner]);

  // ======================
  // Tempo (quinzenal rolling)
  // ======================
  const today = useMemo(() => startOfDay(new Date()), []);
  const last14Start = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 14);
    return d;
  }, [today]);
  const prev14Start = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 28);
    return d;
  }, [today]);

  const thisWeekStart = useMemo(() => weekStart(today), [today]);

  // metas/limites (14 dias) — ajuste conforme sua operação
  const threshold = {
    finalizadosMin14d: 20,
    canceladosMax14d: 10,
  };

  // ======================
  // KPIs topo (Geral) — 14d vs 14d anteriores
  // ======================
  const kpiTop = useMemo(() => {
    const total = filtered.length;
    const open = filtered.filter((r) => ["NOVO", "REUNIAO", "ANDAMENTO"].includes(r.status)).length;

    const countLast14 = (status: RecordStatus) => {
      let c = 0;
      for (const r of filtered) {
        if (r.status !== status) continue;
        const d = getEventDateForStatus(r);
        if (!d) continue;
        const ts = d.getTime();
        if (ts >= last14Start.getTime() && ts < today.getTime()) c += 1;
      }
      return c;
    };

    const countPrev14 = (status: RecordStatus) => {
      let c = 0;
      for (const r of filtered) {
        if (r.status !== status) continue;
        const d = getEventDateForStatus(r);
        if (!d) continue;
        const ts = d.getTime();
        if (ts >= prev14Start.getTime() && ts < last14Start.getTime()) c += 1;
      }
      return c;
    };

    const fin14 = countLast14("FINALIZADO");
    const finPrev14 = countPrev14("FINALIZADO");
    const finDelta14 = fin14 - finPrev14;

    const can14 = countLast14("CANCELADO");
    const canPrev14 = countPrev14("CANCELADO");
    const canDelta14 = can14 - canPrev14;

    return { total, open, fin14, finDelta14, can14, canDelta14 };
  }, [filtered, last14Start, prev14Start, today]);

  // ======================
  // Distribuição por status (com % + 14d + delta)
  // ======================
  const statusContextData = useMemo(() => {
    const total = filtered.length || 1;

    const last14By: Record<string, number> = {};
    const prev14By: Record<string, number> = {};

    for (const r of filtered) {
      const d = getEventDateForStatus(r);
      if (!d) continue;
      const ts = d.getTime();

      if (ts >= last14Start.getTime() && ts < today.getTime()) {
        last14By[r.status] = (last14By[r.status] || 0) + 1;
      }
      if (ts >= prev14Start.getTime() && ts < last14Start.getTime()) {
        prev14By[r.status] = (prev14By[r.status] || 0) + 1;
      }
    }

    // pequena otimização: conta por status em 1 passe (evita N filters)
    const totalByStatus: Record<string, number> = {};
    for (const r of filtered) totalByStatus[r.status] = (totalByStatus[r.status] || 0) + 1;

    return STATUS_OPTIONS.map((s) => {
      const count = totalByStatus[s] || 0;
      const pct = (count / total) * 100;
      const last14 = last14By[s] || 0;
      const prev14 = prev14By[s] || 0;
      const delta14 = last14 - prev14;

      const alert =
        s === "FINALIZADO"
          ? last14 < threshold.finalizadosMin14d
            ? "ruim"
            : "ok"
          : s === "CANCELADO"
            ? last14 > threshold.canceladosMax14d
              ? "alerta"
              : "ok"
            : "ok";

      return {
        status: s,
        name: STATUS_CONFIG[s].label,
        count,
        pct,
        last14,
        delta14,
        alert,
        color: STATUS_COLORS[s],
      };
    });
  }, [filtered, last14Start, prev14Start, today]);

  // ======================
  // Throughput semanal (últimas 12 semanas) — gráfico detalhe
  // ======================
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

  // ======================
  // Lead time (dias) — média/mediana/P75 por status terminal
  // ======================
  const leadTimeStats = useMemo(() => {
    const buckets: Record<string, number[]> = { FINALIZADO: [], CANCELADO: [], DEVOLVIDO: [] };

    for (const r of filtered) {
      if (r.status === "FINALIZADO" || r.status === "CANCELADO") {
        const end = toDateOnly(r.end_date);
        const start = toDateOnly(r.start_date);
        if (end && start) buckets[r.status].push(Math.max(0, diffDays(end, start)));
      }
      if (r.status === "DEVOLVIDO") {
        const end = toDateOnly(r.devolucao_date);
        const start = toDateOnly(r.start_date);
        if (end && start) buckets.DEVOLVIDO.push(Math.max(0, diffDays(end, start)));
      }
    }

    const median = (arr: number[]) => {
      if (!arr.length) return 0;
      const a = [...arr].sort((x, y) => x - y);
      const mid = Math.floor(a.length / 2);
      return a.length % 2 === 0 ? (a[mid - 1] + a[mid]) / 2 : a[mid];
    };

    const mean = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);

    const p75 = (arr: number[]) => {
      if (!arr.length) return 0;
      const a = [...arr].sort((x, y) => x - y);
      const idx = Math.floor(0.75 * (a.length - 1));
      return a[idx];
    };

    return (["FINALIZADO", "CANCELADO", "DEVOLVIDO"] as RecordStatus[]).map((s) => ({
      status: s,
      name: STATUS_CONFIG[s].label,
      count: buckets[s].length,
      median: Number(median(buckets[s]).toFixed(1)),
      mean: Number(mean(buckets[s]).toFixed(1)),
      p75: Number(p75(buckets[s]).toFixed(1)),
      color: STATUS_COLORS[s],
    }));
  }, [filtered]);

  // ======================
  // Aging buckets (abertos)
  // ======================
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

  const totalOpen45Plus = useMemo(() => {
    const b = agingBuckets.find((x) => x.bucket === "45+");
    return b?.count || 0;
  }, [agingBuckets]);

  // ======================
  // Ranking por owner (carga + finalizados semana + lead time médio 30d)
  // ======================
  const ownerRanking = useMemo(() => {
    const open = filtered.filter((r) => ["NOVO", "REUNIAO", "ANDAMENTO"].includes(r.status));

    const last30Start = new Date(today);
    last30Start.setDate(last30Start.getDate() - 30);

    const by: Record<
      string,
      { owner: string; in_progress: number; finalized_week: number; lead_sum: number; lead_n: number }
    > = {};

    const ensure = (owner: string) => {
      const key = owner?.trim() ? owner.trim() : "—";
      if (!by[key]) by[key] = { owner: key, in_progress: 0, finalized_week: 0, lead_sum: 0, lead_n: 0 };
      return by[key];
    };

    for (const r of open) ensure(r.owner || "").in_progress += 1;

    for (const r of filtered) {
      const o = ensure(r.owner || "");

      if (r.status === "FINALIZADO") {
        const end = toDateOnly(r.end_date);
        if (end && end.getTime() >= thisWeekStart.getTime() && end.getTime() < today.getTime()) o.finalized_week += 1;
      }

      // lead time médio (últimos 30d, terminal)
      if (r.status === "FINALIZADO" || r.status === "CANCELADO") {
        const end = toDateOnly(r.end_date);
        const start = toDateOnly(r.start_date);
        if (end && start && end.getTime() >= last30Start.getTime()) {
          o.lead_sum += Math.max(0, diffDays(end, start));
          o.lead_n += 1;
        }
      }

      if (r.status === "DEVOLVIDO") {
        const end = toDateOnly(r.devolucao_date);
        const start = toDateOnly(r.start_date);
        if (end && start && end.getTime() >= last30Start.getTime()) {
          o.lead_sum += Math.max(0, diffDays(end, start));
          o.lead_n += 1;
        }
      }
    }

    return Object.values(by)
      .map((x) => ({ ...x, lead_time_avg: x.lead_n ? Number((x.lead_sum / x.lead_n).toFixed(1)) : 0 }))
      .sort((a, b) => b.in_progress - a.in_progress);
  }, [filtered, today, thisWeekStart]);

  const ownerRankingChart = useMemo(
    () => ownerRanking.slice(0, 10).map((o) => ({ owner: o.owner, in_progress: o.in_progress })),
    [ownerRanking]
  );

  // ======================
  // Reuniões: volume + conversão (≤7d, proxy)
  // ======================
  const meetingsWeekly = useMemo(() => {
    const rows: Record<string, any> = {};
    const X = 7;

    for (const r of filtered) {
      const mdt = toDateTime(r.meeting_datetime);
      if (!mdt) continue;

      const ws = weekStart(mdt);
      const key = ws.toISOString().slice(0, 10);
      if (!rows[key]) rows[key] = { key, week: fmtWeek(ws), reunioes: 0, convertidas: 0, conversao: 0 };

      rows[key].reunioes += 1;

      const isConverted = r.status !== "REUNIAO";
      if (!isConverted) continue;

      const moveDate =
        r.status === "FINALIZADO" || r.status === "CANCELADO"
          ? toDateOnly(r.end_date)
          : r.status === "DEVOLVIDO"
            ? toDateOnly(r.devolucao_date)
            : toDateTime((r as any).updated_at);

      if (!moveDate) continue;

      const days = diffDays(moveDate, mdt);
      if (days <= X) rows[key].convertidas += 1;
    }

    return Object.values(rows)
      .map((r: any) => ({ ...r, conversao: r.reunioes ? Number(((r.convertidas / r.reunioes) * 100).toFixed(0)) : 0 }))
      .sort((a: any, b: any) => (a.key > b.key ? 1 : -1))
      .slice(-12);
  }, [filtered]);

  const meetingsSummary = useMemo(() => {
    const currentKey = thisWeekStart.toISOString().slice(0, 10);
    const row = meetingsWeekly.find((x: any) => x.key === currentKey);
    return {
      weekLabel: fmtWeek(thisWeekStart),
      reunioes: row?.reunioes || 0,
      convertidas: row?.convertidas || 0,
      conversao: row?.conversao || 0,
    };
  }, [meetingsWeekly, thisWeekStart]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AppHeader
        title="Dashboard (Geral)"
        subtitle="Visão consolidada com leitura executiva + detalhes em gráficos"
        onMenuClick={onMenuClick}
      />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
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

                <div className="ml-auto flex items-center gap-3">
                  <div className="text-xs text-muted-foreground">{filtered.length} registros</div>
                  <Button variant="outline" size="sm" onClick={() => setShowCharts((v) => !v)} className="h-8">
                    {showCharts ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Ocultar gráficos
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Ver gráficos (detalhe)
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* explicação curta dos filtros */}
              <div className="mt-2 text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium">Serviço</span> muda o recorte (ex.: RC-V, SMP).{" "}
                <span className="font-medium">Status</span> filtra pelo estado atual do card.{" "}
                <span className="font-medium">Responsável</span> mostra carga e performance por pessoa.
              </div>
            </div>

            {/* KPIs topo (14d) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="kpi-card">
                <div className="text-2xl font-bold text-foreground">{kpiTop.total}</div>
                <div className="text-xs text-muted-foreground">Total (recorte atual)</div>
              </div>

              <div className="kpi-card">
                <div className="text-2xl font-bold text-foreground">{kpiTop.open}</div>
                <div className="text-xs text-muted-foreground">Abertos (NOVO/REUNIÃO/ANDAMENTO)</div>
              </div>

              <div className="kpi-card">
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold text-foreground">{kpiTop.fin14}</div>
                  <div className={cn("text-xs", kpiTop.finDelta14 >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {kpiTop.finDelta14 >= 0 ? `+${kpiTop.finDelta14}` : kpiTop.finDelta14} (14d)
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Finalizados (14d) {kpiTop.fin14 < threshold.finalizadosMin14d ? "• abaixo do ideal" : "• OK"}
                </div>
              </div>

              <div className="kpi-card">
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold text-foreground">{kpiTop.can14}</div>
                  <div className={cn("text-xs", kpiTop.canDelta14 >= 0 ? "text-rose-600" : "text-emerald-600")}>
                    {kpiTop.canDelta14 >= 0 ? `+${kpiTop.canDelta14}` : kpiTop.canDelta14} (14d)
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Cancelados (14d) {kpiTop.can14 > threshold.canceladosMax14d ? "• atenção" : "• OK"}
                </div>
              </div>
            </div>

            {/* Resumo executivo (texto) */}
            <div className="corp-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Resumo executivo</h3>
                  <div className="text-xs text-muted-foreground mt-1">
                    Leitura rápida (sem gráficos) do que está acontecendo com base nos filtros acima.
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Período atual: <span className="font-medium">últimos 14 dias</span> (vs 14 dias anteriores).
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border bg-background/40 p-4">
                  <div className="text-xs font-semibold text-foreground mb-2">1) Estoque de trabalho (abertos)</div>
                  <div className="text-sm text-foreground leading-relaxed">
                    Atualmente temos <span className="font-semibold">{kpiTop.total}</span> integrações no recorte selecionado.
                    Destas, <span className="font-semibold">{kpiTop.open}</span> estão abertas (NOVO/REUNIÃO/ANDAMENTO) — isso
                    é o <span className="font-semibold">estoque</span> de trabalho pendente.
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground leading-relaxed">
                    Impacto: quanto maior o estoque aberto, maior risco de fila, atraso e pressão em SLA.
                  </div>
                </div>

                <div className="rounded-xl border bg-background/40 p-4">
                  <div className="text-xs font-semibold text-foreground mb-2">2) Produção e perda (últimos 14 dias)</div>
                  <div className="text-sm text-foreground leading-relaxed">
                    Nos últimos 14 dias, foram <span className="font-semibold">{kpiTop.fin14}</span> finalizadas (
                    {kpiTop.finDelta14 >= 0 ? "↑" : "↓"}{" "}
                    <span className={cn("font-semibold", kpiTop.finDelta14 >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {kpiTop.finDelta14 >= 0 ? `+${kpiTop.finDelta14}` : kpiTop.finDelta14}
                    </span>{" "}
                    vs 14 dias anteriores). No mesmo período, <span className="font-semibold">{kpiTop.can14}</span> foram
                    canceladas ({kpiTop.canDelta14 >= 0 ? "↑" : "↓"}{" "}
                    <span className={cn("font-semibold", kpiTop.canDelta14 >= 0 ? "text-rose-600" : "text-emerald-600")}>
                      {kpiTop.canDelta14 >= 0 ? `+${kpiTop.canDelta14}` : kpiTop.canDelta14}
                    </span>{" "}
                    vs 14 dias anteriores).
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground leading-relaxed">
                    Impacto: finalizações mostram entrega. Cancelamentos indicam perda. Se cancelamentos sobem, vale revisar
                    triagem e critérios de aceite.
                  </div>

                  <div className="mt-2 text-xs">
                    {kpiTop.fin14 < threshold.finalizadosMin14d ? (
                      <span className="text-rose-600 font-medium">
                        Alerta: finalizações abaixo de {threshold.finalizadosMin14d}/14d — backlog tende a crescer.
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium">OK: ritmo de finalização saudável.</span>
                    )}
                    {kpiTop.can14 > threshold.canceladosMax14d && (
                      <span className="text-amber-600 font-medium">
                        {" "}
                        • Atenção: cancelamentos acima de {threshold.canceladosMax14d}/14d — investigar causas.
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border bg-background/40 p-4">
                  <div className="text-xs font-semibold text-foreground mb-2">3) Risco de SLA (idade dos abertos)</div>
                  <div className="text-sm text-foreground leading-relaxed">
                    O principal sinal de risco é o bucket <span className="font-semibold">45+ dias</span>. Atualmente há{" "}
                    <span className={cn("font-semibold", totalOpen45Plus > 0 ? "text-amber-600" : "text-emerald-600")}>
                      {totalOpen45Plus}
                    </span>{" "}
                    itens nessa faixa.
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {agingBuckets.map((b) => (
                      <span key={b.bucket} className="text-xs px-2 py-1 rounded-md border text-muted-foreground">
                        {b.bucket}: <span className="font-semibold text-foreground">{b.count}</span>
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground leading-relaxed">
                    Impacto: itens 45+ aumentam chance de escalonamento e SLA estourado. Ação típica: priorizar 45+ e destravar
                    dependências.
                  </div>
                </div>

                <div className="rounded-xl border bg-background/40 p-4">
                  <div className="text-xs font-semibold text-foreground mb-2">4) Reuniões (resultado vs ritual)</div>
                  <div className="text-sm text-foreground leading-relaxed">
                    Na semana atual ({meetingsSummary.weekLabel}), tivemos{" "}
                    <span className="font-semibold">{meetingsSummary.reunioes}</span> reuniões e{" "}
                    <span className="font-semibold">{meetingsSummary.convertidas}</span> viraram andamento/finalização em até 7
                    dias (conversão de <span className="font-semibold">{meetingsSummary.conversao}%</span>).
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground leading-relaxed">
                    Impacto: conversão baixa sugere reunião sem ação clara. Ação: padronizar “decisão + próximo passo + owner +
                    data”.
                  </div>

                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Obs.: conversão usa <span className="font-medium">updated_at</span> como proxy (não há histórico de
                    transição).
                  </div>
                </div>
              </div>
            </div>

            {showCharts && (
              <div className="space-y-4">
                {/* Distribuição por status */}
                <div className="corp-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Distribuição por status (contexto)</h3>
                      <div className="text-xs text-muted-foreground">% do total + tendência 14d vs 14d anteriores + alertas</div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-1 rounded-md border">
                        Finalizados &lt; {threshold.finalizadosMin14d}/14d = ruim
                      </span>
                      <span className="px-2 py-1 rounded-md border">
                        Cancelados &gt; {threshold.canceladosMax14d}/14d = alerta
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-2">Status</th>
                            <th className="text-right text-xs font-semibold text-muted-foreground px-3 py-2">Qtd</th>
                            <th className="text-right text-xs font-semibold text-muted-foreground px-3 py-2">%</th>
                            <th className="text-right text-xs font-semibold text-muted-foreground px-3 py-2">14d</th>
                            <th className="text-right text-xs font-semibold text-muted-foreground px-3 py-2">Δ 14d</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {statusContextData.map((s) => (
                            <tr key={s.status}>
                              <td className="px-3 py-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className={cn("w-2 h-2 rounded-full", STATUS_CONFIG[s.status].dot)} />
                                  <span className="text-foreground">{s.name}</span>
                                  {s.alert !== "ok" && (
                                    <span
                                      className={cn(
                                        "text-[10px] px-2 py-0.5 rounded-full border",
                                        s.alert === "ruim" && "border-red-500/30 text-red-500",
                                        s.alert === "alerta" && "border-amber-500/30 text-amber-600"
                                      )}
                                    >
                                      {s.alert}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right text-xs text-foreground font-medium">{s.count}</td>
                              <td className="px-3 py-2 text-right text-xs text-muted-foreground">{s.pct.toFixed(0)}%</td>
                              <td className="px-3 py-2 text-right text-xs text-muted-foreground">{s.last14}</td>
                              <td
                                className={cn(
                                  "px-3 py-2 text-right text-xs",
                                  s.delta14 >= 0 ? "text-emerald-600" : "text-rose-600"
                                )}
                              >
                                {s.delta14 >= 0 ? `+${s.delta14}` : s.delta14}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={statusContextData} layout="vertical" barSize={14}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(220 15% 92%)" />
                          <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(220 15% 50%)" }} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 10, fill: "hsl(220 15% 50%)" }}
                            width={140}
                          />
                          <RechartsTooltip
                            contentStyle={{ borderRadius: 8, fontSize: 11 }}
                            formatter={(value: any, _name: any, props: any) => {
                              const pct = props?.payload?.pct;
                              return [`${value} (${pct?.toFixed?.(0)}%)`, "Qtd"];
                            }}
                          />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                            {statusContextData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Throughput */}
                <div className="corp-card p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Throughput (por semana)</h3>
                    <div className="text-xs text-muted-foreground">
                      Finalizado x Cancelado x Devolvido (últimas 12 semanas)
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={throughputWeekly} barSize={18}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 92%)" />
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(220 15% 50%)" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(220 15% 50%)" }} allowDecimals={false} />
                      <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="FINALIZADO" stackId="a" fill={STATUS_COLORS.FINALIZADO} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="CANCELADO" stackId="a" fill={STATUS_COLORS.CANCELADO} />
                      <Bar dataKey="DEVOLVIDO" stackId="a" fill={STATUS_COLORS.DEVOLVIDO} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Lead time */}
                <div className="corp-card p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Lead time (dias)</h3>
                    <div className="text-xs text-muted-foreground">Média, mediana e P75 por status terminal</div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={leadTimeStats} barSize={18}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 92%)" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(220 15% 50%)" }} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(220 15% 50%)" }} />
                          <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="median" name="Mediana" fill="hsl(220 15% 45%)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="mean" name="Média" fill="hsl(220 15% 65%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-2">Status</th>
                            <th className="text-right text-xs font-semibold text-muted-foreground px-3 py-2">N</th>
                            <th className="text-right text-xs font-semibold text-muted-foreground px-3 py-2">Mediana</th>
                            <th className="text-right text-xs font-semibold text-muted-foreground px-3 py-2">Média</th>
                            <th className="text-right text-xs font-semibold text-muted-foreground px-3 py-2">P75</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {leadTimeStats.map((s) => (
                            <tr key={s.status}>
                              <td className="px-3 py-2 text-xs text-foreground">{s.name}</td>
                              <td className="px-3 py-2 text-right text-xs text-muted-foreground">{s.count}</td>
                              <td className="px-3 py-2 text-right text-xs text-muted-foreground">{s.median}</td>
                              <td className="px-3 py-2 text-right text-xs text-muted-foreground">{s.mean}</td>
                              <td className="px-3 py-2 text-right text-xs text-muted-foreground">{s.p75}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Aging */}
                <div className="corp-card p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Aging (abertos)</h3>
                    <div className="text-xs text-muted-foreground">Buckets 0–15 / 15–25 / 25–45 / 45+</div>
                  </div>

                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={agingBuckets} barSize={22}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 92%)" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "hsl(220 15% 50%)" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(220 15% 50%)" }} allowDecimals={false} />
                      <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                      <Bar dataKey="count" name="Cards" fill={STATUS_COLORS.ANDAMENTO} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Ranking owner */}
                <div className="corp-card p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Ranking por responsável</h3>
                    <div className="text-xs text-muted-foreground">Carga, produção (semana) e lead time médio (30d)</div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={ownerRankingChart} layout="vertical" barSize={14}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(220 15% 92%)" />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 10, fill: "hsl(220 15% 50%)" }}
                            allowDecimals={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="owner"
                            tick={{ fontSize: 10, fill: "hsl(220 15% 50%)" }}
                            width={140}
                          />
                          <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                          <Bar
                            dataKey="in_progress"
                            name="Em andamento"
                            fill={STATUS_COLORS.ANDAMENTO}
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="text-xs text-muted-foreground mt-2">Top 10 por carga atual.</div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-2">Owner</th>
                            <th className="text-right text-xs font-semibold text-muted-foreground px-3 py-2">Em andamento</th>
                            <th className="text-right text-xs font-semibold text-muted-foreground px-3 py-2">
                              Finalizados (semana)
                            </th>
                            <th className="text-right text-xs font-semibold text-muted-foreground px-3 py-2">
                              Lead time médio (30d)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {ownerRanking.map((o) => (
                            <tr key={o.owner}>
                              <td className="px-3 py-2 text-xs text-foreground">{o.owner}</td>
                              <td className="px-3 py-2 text-right text-xs text-muted-foreground">{o.in_progress}</td>
                              <td className="px-3 py-2 text-right text-xs text-muted-foreground">{o.finalized_week}</td>
                              <td className="px-3 py-2 text-right text-xs text-muted-foreground">{o.lead_time_avg}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Reuniões */}
                <div className="corp-card p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Reuniões operacionais</h3>
                    <div className="text-xs text-muted-foreground">Volume + conversão em até 7 dias (proxy)</div>
                  </div>

                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={meetingsWeekly} barSize={18}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 92%)" />
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(220 15% 50%)" }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(220 15% 50%)" }} allowDecimals={false} />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 10, fill: "hsl(220 15% 50%)" }}
                        domain={[0, 100]}
                      />
                      <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar yAxisId="left" dataKey="reunioes" name="Reuniões" fill={STATUS_COLORS.REUNIAO} radius={[4, 4, 0, 0]} />
                      <Bar
                        yAxisId="left"
                        dataKey="convertidas"
                        name="Convertidas (≤7d)"
                        fill={STATUS_COLORS.FINALIZADO}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="conversao"
                        name="Conversão %"
                        fill={STATUS_COLORS.ANDAMENTO}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="text-xs text-muted-foreground mt-2">
                    Observação: conversão usa <span className="font-medium">updated_at</span> como proxy de transição quando não é terminal.
                  </div>
                </div>
              </div>
            )}

            {/* tabela simples (geral) */}
            <div className="corp-card overflow-hidden">
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
                      <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 hidden sm:table-cell">
                        Owner
                      </th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 hidden md:table-cell">
                        Início
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.slice(0, 50).map((r) => (
                      <tr key={r.id} className="table-row-hover">
                        <td className="px-5 py-3 text-xs text-muted-foreground">{r.service_name}</td>
                        <td className="px-3 py-3 font-medium text-foreground">{r.client_name}</td>
                        <td className="px-3 py-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-3 py-3 text-muted-foreground text-xs hidden sm:table-cell">{(r.owner || "").trim() || "-"}</td>
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
                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                          Nenhum registro encontrado com os filtros atuais.
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
    </div>
  );
}