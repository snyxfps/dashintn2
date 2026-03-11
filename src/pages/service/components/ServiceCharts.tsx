import React, { useMemo } from "react";
import type { RecordStatus, ServiceRecord } from "@/types";
import { STATUS_CONFIG } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<RecordStatus, string> = {
  NOVO: "#94a3b8",
  REUNIAO: "#a78bfa",
  ANDAMENTO: "#3b82f6",
  FINALIZADO: "#22c55e",
  CANCELADO: "#ef4444",
  DEVOLVIDO: "#f97316",
};

function toDateOnly(v: string | null | undefined): Date | null {
  const s = String(v || "").trim();
  if (!s) return null;
  const base = s.includes("T") ? s.split("T")[0] : s;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(base);
  if (!m) return null;
  const [, yyyy, mm, dd] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0, 0);
}
function toDateTime(v: string | null | undefined): Date | null {
  const s = String(v || "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function weekStart(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay(); // Sun..Sat
  const delta = (day + 6) % 7; // Monday start
  x.setDate(x.getDate() - delta);
  return x;
}
function fmtWeek(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}
function getEventDateForStatus(r: ServiceRecord): Date | null {
  if (r.status === "FINALIZADO" || r.status === "CANCELADO") return toDateOnly(r.end_date);
  if (r.status === "DEVOLVIDO") return toDateOnly(r.devolucao_date);
  if (r.status === "REUNIAO") return toDateTime(r.meeting_datetime);
  if (r.status === "NOVO") return toDateOnly(r.cadastro_date) || toDateOnly(r.start_date);
  return toDateOnly(r.start_date);
}

export function ServiceCharts({
  records,
  allowedStatusOptions,
  show,
  loading,
}: {
  records: ServiceRecord[];
  allowedStatusOptions: RecordStatus[];
  show: boolean;
  loading: boolean;
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const last7Start = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    return d;
  }, [today]);
  const prev7Start = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 14);
    return d;
  }, [today]);

  const threshold = { finalizadosMinWeek: 10, canceladosMaxWeek: 5 };

  const statusContextData = useMemo(() => {
    const total = records.length || 1;
    const last7ByStatus: Record<string, number> = {};
    const prev7ByStatus: Record<string, number> = {};

    for (const r of records) {
      const d = getEventDateForStatus(r);
      if (!d) continue;
      const ts = d.getTime();

      if (ts >= last7Start.getTime() && ts < today.getTime()) last7ByStatus[r.status] = (last7ByStatus[r.status] || 0) + 1;
      if (ts >= prev7Start.getTime() && ts < last7Start.getTime()) prev7ByStatus[r.status] = (prev7ByStatus[r.status] || 0) + 1;
    }

    return allowedStatusOptions.map((s) => {
      const count = records.filter((r) => r.status === s).length;
      const pct = (count / total) * 100;
      const last7 = last7ByStatus[s] || 0;
      const prev7 = prev7ByStatus[s] || 0;
      const delta = last7 - prev7;

      const alert =
        s === "FINALIZADO" ? (last7 < threshold.finalizadosMinWeek ? "ruim" : "ok") :
          s === "CANCELADO" ? (last7 > threshold.canceladosMaxWeek ? "alerta" : "ok") :
            "ok";

      return {
        status: s,
        name: STATUS_CONFIG[s].label,
        count,
        pct,
        last7,
        delta,
        alert,
        color: STATUS_COLORS[s],
      };
    });
  }, [allowedStatusOptions, last7Start, prev7Start, records, today]);

  const throughputWeekly = useMemo(() => {
    // últimas 12 semanas
    const weeks = new Map<string, { week: string; FINALIZADO: number; CANCELADO: number; DEVOLVIDO: number }>();
    for (const r of records) {
      if (!["FINALIZADO", "CANCELADO", "DEVOLVIDO"].includes(r.status)) continue;
      const d = getEventDateForStatus(r);
      if (!d) continue;
      const ws = weekStart(d);
      const key = ws.toISOString().slice(0, 10);
      const label = fmtWeek(ws);
      if (!weeks.has(key)) weeks.set(key, { week: label, FINALIZADO: 0, CANCELADO: 0, DEVOLVIDO: 0 });
      (weeks.get(key) as any)[r.status] += 1;
    }
    const arr = Array.from(weeks.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([, v]) => v);
    return arr;
  }, [records]);

  if (!show) return null;

  return (
    <div className="space-y-6">
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/5">
          <div>
            <h3 className="text-sm font-black text-foreground uppercase tracking-widest leading-none">Distribuição por status</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1.5">Análise em tempo real + Variação 7d</p>
          </div>
          <div className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md uppercase tracking-tighter self-start sm:self-center">
            Consolidado
          </div>
        </div>

        {loading ? (
          <div className="p-6"><Skeleton className="h-72 w-full rounded-2xl" /></div>
        ) : (
          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/5 shadow-inner">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Qtd</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">%</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Δ 7d</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {statusContextData.map((s) => (
                      <tr key={s.status} className="hover:bg-white/5 transition-colors group">
                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="text-xs font-bold text-foreground group-hover:text-blue-400 transition-colors">{s.name}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-black tabular-nums">{s.count}</td>
                        <td className="px-4 py-3 text-right text-[10px] font-bold text-muted-foreground">{s.pct.toFixed(0)}%</td>
                        <td className={cn(
                          "px-4 py-3 text-right text-[10px] font-black tabular-nums",
                          s.delta >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {s.delta >= 0 ? `+${s.delta}` : s.delta}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusContextData} layout="vertical" barSize={10} margin={{ left: 10, right: 30 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontWeight: 700 }}
                      width={120}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }}
                    />
                    <Bar dataKey="count" radius={[0, 10, 10, 0]} animationDuration={1500}>
                      {statusContextData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/5 text-foreground">
          <div>
            <h3 className="text-sm font-black text-foreground uppercase tracking-widest leading-none">Throughput Semanal</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1.5">Eficiência de Conversão (12 semanas)</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-black uppercase text-muted-foreground">Entregas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-[9px] font-black uppercase text-muted-foreground">Retornos</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-6"><Skeleton className="h-72 w-full rounded-2xl" /></div>
        ) : (
          <div className="p-6">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={throughputWeekly} barSize={12} margin={{ top: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="white" opacity={0.05} />
                <XAxis
                  dataKey="week"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 700 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 700 }}
                  allowDecimals={false}
                />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="FINALIZADO" name="Finalizado" fill={STATUS_COLORS.FINALIZADO} radius={[10, 10, 0, 0]} animationDuration={1800} />
                <Bar dataKey="DEVOLVIDO" name="Devolvido" fill={STATUS_COLORS.DEVOLVIDO} radius={[10, 10, 0, 0]} animationDuration={1800} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
