import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ServiceRecord } from "@/types";
import { Users, Activity, CheckCircle, RotateCcw, XCircle } from "lucide-react";

export function ServiceKPIs({ records, loading }: { records: ServiceRecord[]; loading: boolean }) {
  const kpis = [
    { label: "Total no mês", value: records.length, icon: Users, colorVar: "var(--status-andamento)", bgVar: "var(--status-andamento-bg)" },
    { label: "Em Andamento", value: records.filter((r) => r.status === "ANDAMENTO").length, icon: Activity, colorVar: "var(--status-andamento)", bgVar: "var(--status-andamento-bg)" },
    { label: "Finalizados", value: records.filter((r) => r.status === "FINALIZADO").length, icon: CheckCircle, colorVar: "var(--status-finalizado)", bgVar: "var(--status-finalizado-bg)" },
    { label: "Devolvidos", value: records.filter((r) => r.status === "DEVOLVIDO").length, icon: RotateCcw, colorVar: "var(--status-devolvido)", bgVar: "var(--status-devolvido-bg)" },
    { label: "Cancelados", value: records.filter((r) => r.status === "CANCELADO").length, icon: XCircle, colorVar: "var(--status-cancelado)", bgVar: "var(--status-cancelado-bg)" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <div key={k.label} className="corp-card p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">{k.label}</div>
              {loading ? (
                <Skeleton className="mt-2 h-7 w-16" />
              ) : (
                <div className="mt-1 text-2xl font-semibold">{k.value}</div>
              )}
            </div>
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: k.bgVar as any }}>
              <Icon className="h-5 w-5" style={{ color: k.colorVar as any }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
