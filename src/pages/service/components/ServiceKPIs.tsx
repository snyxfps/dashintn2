import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ServiceRecord } from "@/types";
import { Users, Activity, CheckCircle, RotateCcw, XCircle } from "lucide-react";

export function ServiceKPIs({ records, loading }: { records: ServiceRecord[]; loading: boolean }) {
  const kpis = [
    {
      label: "Total no mês",
      value: records.length,
      icon: Users,
      color: "from-blue-500 to-blue-600",
    },
    {
      label: "Em Andamento",
      value: records.filter((r) => r.status === "ANDAMENTO").length,
      icon: Activity,
      color: "from-indigo-500 to-indigo-600",
    },
    {
      label: "Finalizados",
      value: records.filter((r) => r.status === "FINALIZADO").length,
      icon: CheckCircle,
      color: "from-emerald-500 to-emerald-600",
    },
    {
      label: "Devolvidos",
      value: records.filter((r) => r.status === "DEVOLVIDO").length,
      icon: RotateCcw,
      color: "from-orange-500 to-amber-600",
    },
    {
      label: "Cancelados",
      value: records.filter((r) => r.status === "CANCELADO").length,
      icon: XCircle,
      color: "from-rose-500 to-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <div
            key={k.label}
            className={`bg-gradient-to-br ${k.color} p-4 rounded-xl text-white shadow-lg border border-white/10`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className="text-xs font-medium opacity-80 uppercase tracking-wider">
              {k.label}
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16 bg-white/20 mt-1" />
            ) : (
              <div className="text-3xl font-bold mt-1 tabular-nums">{k.value}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
