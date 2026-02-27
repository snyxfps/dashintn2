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

function missingFieldsForStatus(r: Partial<ServiceRecord>, status: RecordStatus) {
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

function normalizePayloadForCompare(form: ServiceFormState) {
  const trimOrNull = (v: string) => {
    const t = (v ?? "").trim();
    return t.length ? t : null;
  };

  return {
    client_name: trimOrNull(form.client_name),
    start_date: trimOrNull(form.start_date),
    status: form.status,
    owner: trimOrNull(form.owner),
    notes: trimOrNull(form.notes),
    agidesk_ticket: trimOrNull(form.agidesk_ticket),
    cadastro_date: trimOrNull(form.cadastro_date),
    meeting_datetime: trimOrNull(form.meeting_datetime),
    integration_type: trimOrNull(form.integration_type),
    end_date: trimOrNull(form.end_date),
    devolucao_date: trimOrNull(form.devolucao_date),
    commercial: trimOrNull(form.commercial),
  };
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

  // Details (Sheet)
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRecord, setDetailsRecord] = useState<ServiceRecord | null>(null);

  const openDetails = (r: ServiceRecord) => {
    setDetailsRecord(r);
    setDetailsOpen(true);
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

  const handleSave = async () => {
    if (!isAdmin) return;
    if (!service?.id) return;

    // ✅ validação também no modal (evita “burlar” regra pelo Save)
    const missing = missingFieldsForStatus(form as any, form.status);
    if (missing.length > 0) {
      toast.message(`Para salvar como "${STATUS_CONFIG[form.status].label}", preencha: ${missing.join(", ")}`);
      return;
    }

    setSaving(true);
    try {
      const base = normalizePayloadForCompare(form);

      const payloadBase = {
        service_id: service.id,
        client_name: base.client_name ?? "",
        start_date: base.start_date ?? todayDateOnlyLocal(),
        status: base.status,
        owner: base.owner ?? "",
        notes: base.notes,
        agidesk_ticket: base.agidesk_ticket,
        cadastro_date: base.cadastro_date,
        meeting_datetime: base.meeting_datetime,
        integration_type: base.integration_type,
        end_date: base.end_date,
        devolucao_date: base.devolucao_date,
        commercial: base.commercial,
      };

      if (editRecord) {
        // ===== UPDATE / STATUS_CHANGE via modal =====
        const old = {
          client_name: (editRecord.client_name ?? "").trim() || null,
          start_date: (editRecord.start_date ?? "").trim() || null,
          status: editRecord.status,
          owner: (editRecord.owner ?? "").trim() || null,
          notes: (editRecord.notes ?? "").trim() || null,
          agidesk_ticket: (editRecord.agidesk_ticket ?? "").trim() || null,
          cadastro_date: (editRecord.cadastro_date ?? "").trim() || null,
          meeting_datetime: (editRecord.meeting_datetime ?? "").trim() || null,
          integration_type: (editRecord.integration_type ?? "").trim() || null,
          end_date: (editRecord.end_date ?? "").trim() || null,
          devolucao_date: (editRecord.devolucao_date ?? "").trim() || null,
          commercial: (editRecord.commercial ?? "").trim() || null,
        };

        await updateRecord.mutateAsync({ id: editRecord.id, patch: payloadBase as any });

        // UPDATE geral (sempre que salva)
        void writeAuditLog({
          recordId: editRecord.id,
          userId: user?.id ?? null,
          action: "UPDATE",
          fieldName: null,
          oldValue: `status=${old.status}`,
          newValue: `status=${base.status}`,
        });

        // STATUS_CHANGE específico (se mudou status)
        if (old.status !== base.status) {
          void writeAuditLog({
            recordId: editRecord.id,
            userId: user?.id ?? null,
            action: "STATUS_CHANGE",
            fieldName: "status",
            oldValue: old.status,
            newValue: base.status,
          });
        }

        // (Opcional) detalhar mudanças mais importantes sem floodar:
        const maybeLogField = (field: keyof typeof old, label: string) => {
          const ov = old[field];
          const nv = (base as any)[field];
          if (String(ov ?? "") !== String(nv ?? "")) {
            void writeAuditLog({
              recordId: editRecord.id,
              userId: user?.id ?? null,
              action: "UPDATE",
              fieldName: label,
              oldValue: ov,
              newValue: nv,
            });
          }
        };

        // Campos que vale a pena rastrear
        maybeLogField("owner", "owner");
        maybeLogField("integration_type", "integration_type");
        maybeLogField("agidesk_ticket", "agidesk_ticket");
        maybeLogField("end_date", "end_date");
        maybeLogField("devolucao_date", "devolucao_date");
        maybeLogField("commercial", "commercial");

        toast.success("Registro atualizado!");
      } else {
        // ===== CREATE =====
        const created = await createRecord.mutateAsync(payloadBase as any);

        // tenta descobrir o id criado (depende de como sua mutation retorna)
        const createdId =
          (created && typeof created === "object" && "id" in created && (created as any).id) ||
          (Array.isArray(created) && created[0]?.id) ||
          null;

        if (createdId) {
          void writeAuditLog({
            recordId: String(createdId),
            userId: user?.id ?? null,
            action: "CREATE",
            fieldName: null,
            oldValue: null,
            newValue: `status=${base.status}`,
          });
        } else {
          // Se sua mutation não retorna id, não tem recordId pra logar.
          // Você pode optar por remover este bloco, mas deixei pra não “sumir” o evento.
          console.warn("CREATE audit: createRecord não retornou id. Ajuste a mutation para retornar o registro criado.");
        }

        toast.success("Registro criado!");
      }

      if (pendingMove) setPendingMove(null);
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

    // captura info antes de deletar (pra auditoria ficar útil)
    const rec = records.find((r) => r.id === deleteId);
    const snapshot = rec ? `${rec.client_name} | status=${rec.status}` : `id=${deleteId}`;

    try {
      // audita ANTES (se existir FK cascade na auditoria, auditar depois pode perder o log)
      void writeAuditLog({
        recordId: deleteId,
        userId: user?.id ?? null,
        action: "DELETE",
        fieldName: null,
        oldValue: snapshot,
        newValue: null,
      });

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
          newStatus === "FINALIZADO" || newStatus === "CANCELADO" ? f.end_date || todayDateOnlyLocal() : f.end_date,
        devolucao_date: newStatus === "DEVOLVIDO" ? f.devolucao_date || todayDateOnlyLocal() : f.devolucao_date,
      }));
      setPendingMove({ id, to: newStatus });
      return;
    }

    try {
      await moveStatus.mutateAsync({ id, status: newStatus });

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

            <ServiceCharts records={records} allowedStatusOptions={allowedStatusOptions} show={showChart} loading={isLoading} />

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