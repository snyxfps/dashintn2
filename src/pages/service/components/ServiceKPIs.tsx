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
      accent: "text-blue-100",
      iconBg: "bg-blue-400/20"
    },
    {
      label: "Em Andamento",
      value: records.filter((r) => r.status === "ANDAMENTO").length,
      icon: Activity,
      color: "from-indigo-500 to-indigo-600",
      accent: "text-indigo-100",
      iconBg: "bg-indigo-400/20"
    },
    {
      label: "Finalizados",
      value: records.filter((r) => r.status === "FINALIZADO").length,
      icon: CheckCircle,
      color: "from-emerald-500 to-emerald-600",
      accent: "text-emerald-100",
      iconBg: "bg-emerald-400/20"
    },
    {
      label: "Devolvidos",
      value: records.filter((r) => r.status === "DEVOLVIDO").length,
      icon: RotateCcw,
      color: "from-orange-500 to-amber-600",
      accent: "text-orange-100",
      iconBg: "bg-orange-400/20"
    },
    {
      label: "Cancelados",
      value: records.filter((r) => r.status === "CANCELADO").length,
      icon: XCircle,
      color: "from-rose-500 to-red-600",
      accent: "text-rose-100",
      iconBg: "bg-rose-400/20"
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {kpis.map((k, index) => {
        const Icon = k.icon;
        return (
          <div
            key={k.label}
            className={`relative overflow-hidden group p-5 rounded-2xl border border-white/10 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-gradient-to-br ${k.color} text-white anim-fade-up`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Background pattern */}
            <div className="absolute -right-4 -top-4 opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12 text-white">
              <Icon size={80} strokeWidth={1} />
            </div>

            <div className="relative z-10 flex flex-col gap-1">
              <div className={`text-xs font-medium uppercase tracking-wider ${k.accent} opacity-90`}>
                {k.label}
              </div>

              <div className="flex items-center justify-between mt-1">
                {loading ? (
                  <Skeleton className="h-9 w-20 bg-white/20" />
                ) : (
                  <div className="text-3xl font-bold tracking-tight">{k.value}</div>
                )}

                <div className={`p-2.5 rounded-xl ${k.iconBg} backdrop-blur-sm shadow-inner`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
