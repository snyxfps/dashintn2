import React, { useMemo, useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import type { RecordStatus, ServiceRecord } from "@/types";
import { STATUS_CONFIG, STATUS_OPTIONS } from "@/types";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, BarChart3, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { todayDateOnlyLocal } from "@/lib/dateOnly";

import { useServiceData } from "@/pages/service/hooks/useServiceData";
import { ServiceKPIs } from "@/pages/service/components/ServiceKPIs";
import { ServiceCharts } from "@/pages/service/components/ServiceCharts";
import { ServiceKanban } from "@/pages/service/components/ServiceKanban";
import { writeAuditLog } from "@/pages/service/audit/audit";
import { ServiceAuditModal } from "@/pages/service/components/ServiceAuditModal";
import { ServiceRecordDetailsSheet } from "@/pages/service/components/ServiceRecordDetailsSheet";
import { ServiceFilters } from "@/pages/service/components/ServiceFilters";
import { ServiceFormModal, type ServiceFormState } from "@/pages/service/components/ServiceFormModal";
import { ServiceExportButton } from "@/pages/service/components/ServiceExportButton";

interface OutletContext {
  onMenuClick: () => void;
}
interface ServicePageProps {
  serviceName: string;
}

const makeEmptyForm = (serviceName: string): ServiceFormState => ({
  client_name: "",
  start_date: todayDateOnlyLocal(),
  status: (serviceName === "RC-V" ? "NOVO" : "ANDAMENTO") as RecordStatus,
  owner: "",
  notes: "",
  agidesk_ticket: "",
  cadastro_date: "",
  meeting_datetime: "",
  integration_type: "",
  end_date: "",
  devolucao_date: "",
  commercial: "",
});

function missingFieldsForStatus(r: ServiceRecord, status: RecordStatus) {
  const missing: string[] = [];

  const has = (v: unknown) => String(v ?? "").trim().length > 0;

  if (status === "NOVO") {
    if (!has(r.cadastro_date)) missing.push("Data do cadastro");
  }
  if (status === "REUNIAO") {
    if (!has(r.meeting_datetime)) missing.push("Data/Hora da reunião");
  }
  if (status === "FINALIZADO" || status === "CANCELADO") {
    if (!has(r.end_date)) missing.push("Data de conclusão");
  }
  if (status === "DEVOLVIDO") {
    if (!has(r.devolucao_date)) missing.push("Data da devolução");
    if (!has(r.commercial)) missing.push("Comercial");
  }

  return missing;
}


export const ServicePage: React.FC<ServicePageProps> = ({ serviceName }) => {
  const { onMenuClick } = useOutletContext<OutletContext>();
  const { isAdmin, user } = useAuth();

  const {
    service,
    serviceMissing,
    records,
    isLoading,
    createService,
    createRecord,
    updateRecord,
    deleteRecord,
    moveStatus,
  } = useServiceData(serviceName);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<RecordStatus | "ALL">("ALL");
  const [filterOwner, setFilterOwner] = useState("");

  const [showChart, setShowChart] = useState(false);

  // Dialog / form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ServiceRecord | null>(null);
  const [form, setForm] = useState<ServiceFormState>(() => makeEmptyForm(serviceName));
  const [saving, setSaving] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ id: string; to: RecordStatus } | null>(null);

  // Auditoria
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditRecord, setAuditRecord] = useState<ServiceRecord | null>(null);

  const openAudit = (r: ServiceRecord) => {
    setAuditRecord(r);
    setAuditOpen(true);
  };

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setForm(makeEmptyForm(serviceName));
    setEditRecord(null);
    setDialogOpen(false);
    setPendingMove(null);
  }, [serviceName]);

  const allowedStatusOptions: RecordStatus[] =
    serviceName === "RC-V" ? STATUS_OPTIONS : STATUS_OPTIONS.filter((s) => s !== "NOVO" && s !== "REUNIAO");

  const kanbanCols: { status: RecordStatus; label: string }[] = [
    { status: "NOVO", label: "Novos Clientes" },
    { status: "REUNIAO", label: "Reuniões" },
    { status: "ANDAMENTO", label: "Em Andamento" },
    { status: "FINALIZADO", label: "Finalizados" },
    { status: "CANCELADO", label: "Cancelados" },
    { status: "DEVOLVIDO", label: "Devolvidos" },
  ];

  const visibleKanbanCols = useMemo(
    () => kanbanCols.filter((c) => allowedStatusOptions.includes(c.status)),
    [allowedStatusOptions]
  );

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchSearch = !search || r.client_name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "ALL" || r.status === filterStatus;
      const matchOwner = !filterOwner || (r.owner || "").toLowerCase().includes(filterOwner.toLowerCase());
      return matchSearch && matchStatus && matchOwner;
    });
  }, [records, search, filterOwner, filterStatus]);

  const openAdd = () => {
    if (!isAdmin) return;
    setEditRecord(null);
    setForm(makeEmptyForm(serviceName));
    setDialogOpen(true);
  };

  const openEdit = (r: ServiceRecord) => {
    if (!isAdmin) return;
    setEditRecord(r);
    setForm({
      client_name: r.client_name ?? "",
      start_date: r.start_date ?? todayDateOnlyLocal(),
      status: r.status,
      owner: r.owner ?? "",
      notes: r.notes ?? "",
      agidesk_ticket: r.agidesk_ticket ?? "",
      cadastro_date: r.cadastro_date ?? "",
      meeting_datetime: r.meeting_datetime ?? "",
      integration_type: r.integration_type ?? "",
      end_date: r.end_date ?? "",
      devolucao_date: r.devolucao_date ?? "",
      commercial: r.commercial ?? "",
    });
    setDialogOpen(true);
  };

  const handleCreateService = async () => {
    if (!isAdmin) return;
    try {
      await createService.mutateAsync();
      toast.success("Serviço criado!");
    } catch (e: unknown) {
      toast.error("Erro ao criar serviço: " + (e instanceof Error ? e.message : "Tente novamente"));
    }
  };

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRecord, setDetailsRecord] = useState<ServiceRecord | null>(null);

  const openDetails = (r: ServiceRecord) => {
    setDetailsRecord(r);
    setDetailsOpen(true);
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    if (!service?.id) return;

    setSaving(true);
    try {
      const payloadBase = {
        service_id: service.id,
        client_name: form.client_name.trim(),
        start_date: form.start_date,
        status: form.status,
        owner: form.owner,
        notes: form.notes || null,
        agidesk_ticket: form.agidesk_ticket || null,
        cadastro_date: form.cadastro_date || null,
        meeting_datetime: form.meeting_datetime || null,
        integration_type: form.integration_type || null,
        end_date: form.end_date || null,
        devolucao_date: form.devolucao_date || null,
        commercial: form.commercial || null,
      };

      if (editRecord) {
        await updateRecord.mutateAsync({ id: editRecord.id, patch: payloadBase as any });
        toast.success("Registro atualizado!");
      } else {
        await createRecord.mutateAsync(payloadBase as any);
        toast.success("Registro criado!");
      }

      // se havia um move pendente, efetiva agora (status já no form)
      if (pendingMove) {
        setPendingMove(null);
      }

      setDialogOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Tente novamente";
      if (String(msg).toLowerCase().includes("duplicate") || String(msg).includes("23505")) {
        toast.error("Já existe um card para este cliente (exceto Reunião). Abra e edite o existente.");
      } else {
        toast.error("Erro ao salvar: " + msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteRecord.mutateAsync(deleteId);
      toast.success("Registro excluído!");
    } catch {
      toast.error("Erro ao excluir");
    } finally {
      setDeleteId(null);
    }
  };

  const handleMove = async (id: string, status: RecordStatus) => {
    if (!isAdmin) return;

    if (serviceName !== "RC-V" && (status === "NOVO" || status === "REUNIAO")) {
      toast.error("Status NOVO/REUNIÃO só é permitido no serviço RC-V");
      return;
    }

    const current = records.find((r) => r.id === id);
    if (!current) return;

    const oldStatus = current.status;
    const newStatus = status;

    const missing = missingFieldsForStatus(current, newStatus);
    if (missing.length > 0) {
      toast.message(`Para mover para "${STATUS_CONFIG[newStatus].label}", preencha: ${missing.join(", ")}`);
      openEdit(current);
      setForm((f) => ({
        ...f,
        status: newStatus,
        end_date:
          newStatus === "FINALIZADO" || newStatus === "CANCELADO"
            ? f.end_date || todayDateOnlyLocal()
            : f.end_date,
        devolucao_date: newStatus === "DEVOLVIDO" ? f.devolucao_date || todayDateOnlyLocal() : f.devolucao_date,
      }));
      setPendingMove({ id, to: newStatus });
      return;
    }

    try {
      await moveStatus.mutateAsync({ id, status: newStatus });

      // Auditoria não deve travar a UX se der erro de RLS/policy
      void writeAuditLog({
        recordId: id,
        userId: user?.id ?? null,
        action: "STATUS_CHANGE",
        fieldName: "status",
        oldValue: oldStatus,
        newValue: newStatus,
      });

      toast.success(`Registro movido para ${STATUS_CONFIG[newStatus].label} com sucesso!`);
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AppHeader
        title={serviceName}
        subtitle={service?.description || undefined}
        onMenuClick={onMenuClick}
        searchValue={search}
        onSearchChange={setSearch}
        actions={
          isAdmin ? (
            <div className="flex items-center gap-2">
              <ServiceExportButton rows={filtered} fileBaseName={serviceName} />
              <Button size="sm" variant="outline" className="h-9" onClick={() => setShowChart((v) => !v)}>
                {showChart ? <EyeOff className="w-3.5 h-3.5 mr-1.5" /> : <BarChart3 className="w-3.5 h-3.5 mr-1.5" />}
                {showChart ? "Ocultar gráficos" : "Ver gráficos"}
              </Button>
              <Button size="sm" onClick={openAdd} className="h-9">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Adicionar
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5">
        {serviceMissing ? (
          <div className="p-6 rounded-xl border bg-card">
            <h2 className="text-lg font-semibold">Serviço não encontrado</h2>
            <p className="text-sm text-muted-foreground mt-1">
              O serviço <span className="font-medium">{serviceName}</span> não existe no seu Supabase.
            </p>
            {isAdmin ? (
              <Button onClick={handleCreateService} className="mt-4">
                Criar serviço agora
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <ServiceKPIs records={records} loading={isLoading} />

            <ServiceFilters
              allowedStatusOptions={allowedStatusOptions}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterOwner={filterOwner}
              setFilterOwner={setFilterOwner}
            />

            <ServiceCharts
              records={records}
              allowedStatusOptions={allowedStatusOptions}
              show={showChart}
              loading={isLoading}
            />

            <ServiceKanban
              records={filtered}
              visibleCols={visibleKanbanCols}
              allowedStatusOptions={allowedStatusOptions}
              isAdmin={isAdmin}
              onEdit={openEdit}
              onAskDelete={(id) => setDeleteId(id)}
              onMove={handleMove}
              onOpen={openDetails}
            />
          </>
        )}
      </div>

      <ServiceFormModal
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setPendingMove(null);
        }}
        title={editRecord ? "Editar registro" : "Novo registro"}
        form={form}
        setForm={setForm}
        isRCV={serviceName === "RC-V"}
        saving={saving}
        onSave={handleSave}
        recordId={editRecord?.id ?? null}
      />

      <ServiceAuditModal
        open={auditOpen}
        onOpenChange={setAuditOpen}
        recordId={auditRecord?.id ?? null}
        title={auditRecord ? `Histórico — ${auditRecord.client_name}` : "Histórico"}
      />

      <ServiceRecordDetailsSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        record={detailsRecord}
        isAdmin={isAdmin}
        onEdit={(r) => {
          setDetailsOpen(false);
          openEdit(r);
      }}
        onAskDelete={(id) => {
          setDetailsOpen(false);
          setDeleteId(id);
      }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};