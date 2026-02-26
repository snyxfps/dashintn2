import React, { useMemo } from "react";
import type { RecordStatus, ServiceRecord } from "@/types";
import { STATUS_CONFIG } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend } from "recharts";

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
    <div className="space-y-4">
      <div className="corp-card p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Distribuição por status</h3>
          <div className="text-xs text-muted-foreground">Contagem atual + contexto (últimos 7 dias)</div>
        </div>

        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Qtd</th>
                    <th className="px-3 py-2 text-right">%</th>
                    <th className="px-3 py-2 text-right">7d</th>
                    <th className="px-3 py-2 text-right">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {statusContextData.map((s) => (
                    <tr key={s.status} className="border-t">
                      <td className="px-3 py-2">{s.name}</td>
                      <td className="px-3 py-2 text-right">{s.count}</td>
                      <td className="px-3 py-2 text-right">{s.pct.toFixed(0)}%</td>
                      <td className="px-3 py-2 text-right">{s.last7}</td>
                      <td className={"px-3 py-2 text-right text-xs " + (s.delta >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {s.delta >= 0 ? `+${s.delta}` : s.delta}
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
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(220 15% 50%)" }} width={140} />
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
        )}
      </div>

      <div className="corp-card p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Throughput (por semana)</h3>
          <div className="text-xs text-muted-foreground">Finalizado x Cancelado x Devolvido (últimas 12 semanas)</div>
        </div>

        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={throughputWeekly} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 92%)" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(220 15% 50%)" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(220 15% 50%)" }} allowDecimals={false} />
              <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="FINALIZADO" name="Finalizado" fill={STATUS_COLORS.FINALIZADO} radius={[4, 4, 0, 0]} />
              <Bar dataKey="CANCELADO" name="Cancelado" fill={STATUS_COLORS.CANCELADO} radius={[4, 4, 0, 0]} />
              <Bar dataKey="DEVOLVIDO" name="Devolvido" fill={STATUS_COLORS.DEVOLVIDO} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
