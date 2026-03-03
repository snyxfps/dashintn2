import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ServiceRecord, Service, RecordStatus, STATUS_CONFIG } from "@/types";
import { useLastUpdate } from "@/pages/dashboard/hooks/useLastUpdate";
import { AppHeader } from "@/components/AppHeader";
import { seedData } from "@/lib/seed";
import { useAuth } from "@/contexts/AuthContext";
import { ServiceRecordDetailsSheet } from "@/pages/service/components/ServiceRecordDetailsSheet";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Users,
  CheckCircle,
  XCircle,
  RotateCcw,
  Activity,
  Trophy,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STATUS_COLORS: Record<RecordStatus, string> = {
  NOVO: "#94a3b8",
  REUNIAO: "#a78bfa",
  ANDAMENTO: "#3b82f6",
  FINALIZADO: "#22c55e",
  CANCELADO: "#ef4444",
  DEVOLVIDO: "#f97316",
};

const SERVICE_COLORS = ["#3b82f6", "#6366f1", "#22c55e", "#f97316"];

interface OutletContext {
  onMenuClick: () => void;
}

function formatDateOnlyFromAny(input: unknown): string | null {
  if (!input) return null;

  if (input instanceof Date && !isNaN(input.getTime())) {
    const d = String(input.getDate()).padStart(2, "0");
    const m = String(input.getMonth() + 1).padStart(2, "0");
    const y = input.getFullYear();
    return `${d}/${m}/${y}`;
  }

  const s = String(input).trim();
  if (!s) return null;

  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;

  const [, yyyy, mm, dd] = m;
  return `${dd}/${mm}/${yyyy}`;
}

export default function DashboardPage() {
  const { onMenuClick } = useOutletContext<OutletContext>();
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const { isAdmin } = useAuth();

  // ✅ expand/collapse (tipado para aceitar string/number conforme seu id real)
  const [expandedId, setExpandedId] = useState<ServiceRecord["id"] | null>(null);
  const toggleRow = (id: ServiceRecord["id"]) => setExpandedId((prev) => (prev === id ? null : id));

  // Sheet
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRecord, setDetailsRecord] = useState<ServiceRecord | null>(null);

  const openDetails = (r: ServiceRecord) => {
    setDetailsRecord(r);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setDetailsRecord(null);
  };

  const { data: lastUpdate } = useLastUpdate();

  const fetchData = async () => {
    setLoading(true);

    const [{ data: recs, error: recErr }, { data: svcs, error: svcErr }] = await Promise.all([
      supabase.from("records").select("*").order("created_at", { ascending: false }),
      supabase.from("services").select("*"),
    ]);

    if (recErr) console.error("records fetch error:", recErr);
    if (svcErr) console.error("services fetch error:", svcErr);

    setRecords((recs as ServiceRecord[]) || []);
    setServices((svcs as Service[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    await seedData();
    await fetchData();
    setSeeding(false);
    toast.success("Dados de exemplo carregados!");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;

    // ✅ tolerante: tenta client_name OU cliente
    return records.filter((r) => {
      const rr = r as any;
      const name = (r.client_name ?? rr.cliente ?? rr.client ?? "").toString().toLowerCase();
      return name.includes(q);
    });
  }, [records, search]);

  // KPIs
  const activeStatuses: RecordStatus[] = ["NOVO", "REUNIAO", "ANDAMENTO"];
  const totalActive = filtered.filter((r) => activeStatuses.includes(r.status)).length;
  const totalAndamento = filtered.filter((r) => r.status === "ANDAMENTO").length;
  const totalFinalizado = filtered.filter((r) => r.status === "FINALIZADO").length;
  const totalCancelado = filtered.filter((r) => r.status === "CANCELADO").length;
  const totalDevolvido = filtered.filter((r) => r.status === "DEVOLVIDO").length;

  // Pie chart data: por serviço
  const serviceChartData = useMemo(
    () =>
      services
        .map((s) => ({
          name: s.name,
          value: filtered.filter((r) => r.service_id === s.id).length,
        }))
        .filter((d) => d.value > 0),
    [services, filtered]
  );

  // Top service
  const topService: (Service & { count: number }) | null = useMemo(() => {
    return services.reduce<(Service & { count: number }) | null>((top, s) => {
      const count = filtered.filter((r) => r.service_id === s.id).length;
      return !top || count > top.count ? { ...s, count } : top;
    }, null);
  }, [services, filtered]);

  // Status bar chart data
  const statusChartData = useMemo(
    () =>
      (["NOVO", "REUNIAO", "ANDAMENTO", "FINALIZADO", "CANCELADO", "DEVOLVIDO"] as RecordStatus[]).map((s) => ({
        label: STATUS_CONFIG[s].label,
        count: filtered.filter((r) => r.status === s).length,
        color: STATUS_COLORS[s],
      })),
    [filtered]
  );

  const kpis = [
    { label: "Clientes Ativos", value: totalActive, icon: Users, color: "hsl(213 90% 48%)", bg: "hsl(213 90% 93%)" },
    { label: "Em Andamento", value: totalAndamento, icon: Activity, color: "hsl(213 90% 48%)", bg: "hsl(213 90% 93%)" },
    { label: "Finalizados", value: totalFinalizado, icon: CheckCircle, color: "hsl(142 65% 42%)", bg: "hsl(142 65% 93%)" },
    { label: "Cancelados", value: totalCancelado, icon: XCircle, color: "hsl(0 72% 51%)", bg: "hsl(0 72% 94%)" },
    { label: "Devolvidos", value: totalDevolvido, icon: RotateCcw, color: "hsl(32 95% 50%)", bg: "hsl(32 95% 93%)" },
  ];

  const recentRecords = filtered.slice(0, 8);
  const lastUpdateDateOnlyBR = formatDateOnlyFromAny(lastUpdate);

  // ✅ normalizadores (para não depender do nome exato das colunas)
  const getCliente = (r: ServiceRecord) => {
    const rr = r as any;
    return (r.client_name ?? rr.cliente ?? rr.client ?? "—").toString();
  };

  const getServiceName = (serviceId: string | null) =>
    services.find((s) => s.id === serviceId)?.name ?? "—";

  const getOwner = (r: ServiceRecord) => {
    const rr = r as any;
    return (rr.owner ?? rr.responsavel ?? rr.responsible ?? rr.owner_name ?? "—").toString();
  };

  const getInicio = (r: ServiceRecord) => {
    const rr = r as any;
    return (
      formatDateOnlyFromAny(rr.data_inicio ?? rr.start_date ?? rr.inicio ?? r.created_at) ?? "—"
    );
  };

  const getObs = (r: ServiceRecord) => {
    const rr = r as any;
    return (rr.observacoes ?? rr.obs ?? rr.notes ?? rr.descricao ?? "—").toString();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gradient-to-b from-muted/30 to-background">
      <AppHeader
        title="Dashboard"
        subtitle="Visão geral de todas as integrações"
        onMenuClick={onMenuClick}
        searchValue={search}
        onSearchChange={setSearch}
        actions={
          records.length === 0 ? (
            <Button size="sm" variant="outline" onClick={handleSeed} disabled={seeding}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${seeding ? "animate-spin" : ""}`} />
              {seeding ? "Carregando..." : "Carregar dados demo"}
            </Button>
          ) : null
        }
      />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5">
        <div className="text-xs text-muted-foreground -mt-2">Atualizado em: {lastUpdateDateOnlyBR ?? "—"}</div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="kpi-card">
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: kpi.bg }}>
                      <kpi.icon className="w-4.5 h-4.5" style={{ color: kpi.color }} />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
                    <div className="text-xs text-muted-foreground font-medium">{kpi.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Bar Chart - Volume por Status */}
              <div className="lg:col-span-2 corp-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Volume por Status</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={statusChartData} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 92%)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(220 15% 50%)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(220 15% 50%)" }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid hsl(220 15% 88%)", fontSize: 12 }}
                      formatter={(value: number) => [value, "Registros"]}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {statusChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-4">
                {/* Pie - por serviço */}
                <div className="corp-card p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Por Serviço</h3>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={serviceChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        dataKey="value"
                        paddingAngle={3}
                      >
                        {serviceChartData.map((_, index) => (
                          <Cell key={index} fill={SERVICE_COLORS[index % SERVICE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Top Serviço */}
                {topService?.name ? (
                  <div
                    className="corp-card p-4"
                    style={{ background: "linear-gradient(135deg, hsl(222 75% 28%) 0%, hsl(213 90% 40%) 100%)" }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs font-semibold text-white/70">Top serviço do mês</span>
                    </div>
                    <div className="text-lg font-bold text-white">{topService.name}</div>
                    <div className="text-sm text-white/60 mt-0.5">{topService.count} registros</div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* LISTA CLICÁVEL */}
            <div className="corp-card overflow-hidden relative z-10">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Registros (lista)</h3>
                <span className="text-xs text-muted-foreground">Mostrando os últimos registros do filtro.</span>
              </div>

              <div className="overflow-x-auto relative z-20 pointer-events-auto">
                <table className="w-full text-sm relative z-20 pointer-events-auto">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Cliente</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3">Serviço</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3">Status</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 hidden sm:table-cell">
                        Responsável
                      </th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 hidden md:table-cell">
                        Início
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentRecords.map((record) => {
                      const isOpen = expandedId === record.id;
                      return (
                        <React.Fragment key={String(record.id)}>
                          <tr className="hover:bg-muted/40 transition-colors">
                            <td className="px-5 py-3 font-medium text-foreground">
                              <button
                                type="button"
                                onClick={() => toggleRow(record.id)}
                                className="w-full text-left flex items-center gap-2 pointer-events-auto"
                              >
                                {isOpen ? (
                                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                                )}
                                <span className="truncate">{getCliente(record)}</span>
                              </button>
                            </td>

                            <td className="px-3 py-3 text-foreground/90">{getServiceName(record.service_id)}</td>
                            <td className="px-3 py-3 text-foreground/90">
                              {STATUS_CONFIG[record.status]?.label ?? record.status}
                            </td>
                            <td className="px-3 py-3 hidden sm:table-cell text-foreground/80">{getOwner(record)}</td>
                            <td className="px-3 py-3 hidden md:table-cell text-foreground/80">{getInicio(record)}</td>
                          </tr>

                          {isOpen && (
                            <tr className="bg-muted/30">
                              <td colSpan={5} className="px-5 py-4">
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <strong>Observações:</strong> {getObs(record)}
                                  </div>
                                  <div>
                                    <strong>Início:</strong> {getInicio(record)}
                                  </div>
                                  <div>
                                    <strong>Cadastro:</strong> {formatDateOnlyFromAny(record.created_at) ?? "—"}
                                  </div>
                                  <div>
                                    <strong>Responsável:</strong> {getOwner(record)}
                                  </div>
                                </div>

                                <div className="mt-4 flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => openDetails(record)}>
                                    Abrir detalhes
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setExpandedId(null)}>
                                    Fechar
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {recentRecords.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-6 text-sm text-muted-foreground">
                          Nenhum registro encontrado com esse filtro.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sheet */}
      {detailsOpen ? (
        <ServiceRecordDetailsSheet
          open={detailsOpen}
          onOpenChange={(o) => {
            if (!o) closeDetails();
            else setDetailsOpen(o);
          }}
          record={detailsRecord}
          isAdmin={isAdmin}
          onEdit={() => {}}
          onAskDelete={() => {}}
        />
      ) : null}
    </div>
  );
}