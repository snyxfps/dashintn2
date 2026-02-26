import React from "react";
import type { RecordStatus } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ServiceAuditLog } from "./ServiceAuditLog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ServiceFormState = {
  client_name: string;
  start_date: string;
  status: RecordStatus;
  owner: string;
  notes: string;
  agidesk_ticket: string;
  cadastro_date: string;
  meeting_datetime: string;
  integration_type: string;
  end_date: string;
  devolucao_date: string;
  commercial: string;
};

export function ServiceFormModal({
  open,
  onOpenChange,
  title,
  form,
  setForm,
  isRCV,
  saving,
  onSave,
  recordId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  form: ServiceFormState;
  setForm: React.Dispatch<React.SetStateAction<ServiceFormState>>;
  isRCV: boolean;
  saving: boolean;
  onSave: () => void;
  recordId?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Input
                placeholder="Nome do cliente"
                value={form.client_name}
                onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as RecordStatus }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {isRCV ? (
                    <>
                      <SelectItem value="NOVO">Novo Cliente</SelectItem>
                      <SelectItem value="REUNIAO">Reunião Operacional</SelectItem>
                    </>
                  ) : null}
                  <SelectItem value="ANDAMENTO">Em Andamento</SelectItem>
                  <SelectItem value="FINALIZADO">Finalizado</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                  <SelectItem value="DEVOLVIDO">Devolvido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data de início</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Input
                placeholder="Nome do responsável"
                value={form.owner}
                onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
              />
            </div>
          </div>

          {isRCV && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ticket Agidesk</Label>
                <Input
                  value={form.agidesk_ticket}
                  onChange={(e) => setForm((f) => ({ ...f, agidesk_ticket: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tipo de Integração</Label>
                <Input
                  value={form.integration_type}
                  onChange={(e) => setForm((f) => ({ ...f, integration_type: e.target.value }))}
                />
              </div>
            </div>
          )}

          {form.status === "NOVO" && (
            <div className="space-y-1.5">
              <Label>Data do cadastro *</Label>
              <Input
                type="date"
                value={form.cadastro_date}
                onChange={(e) => setForm((f) => ({ ...f, cadastro_date: e.target.value }))}
              />
            </div>
          )}

          {form.status === "REUNIAO" && (
            <div className="space-y-1.5">
              <Label>Data/Hora da reunião *</Label>
              <Input
                type="datetime-local"
                value={form.meeting_datetime}
                onChange={(e) => setForm((f) => ({ ...f, meeting_datetime: e.target.value }))}
              />
            </div>
          )}

          {(form.status === "FINALIZADO" || form.status === "CANCELADO") && (
            <div className="space-y-1.5">
              <Label>Data de conclusão *</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
              />
            </div>
          )}

          {form.status === "DEVOLVIDO" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data da devolução *</Label>
                <Input
                  type="date"
                  value={form.devolucao_date}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      devolucao_date: e.target.value,
                      start_date: e.target.value || f.start_date,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Comercial *</Label>
                <Input
                  placeholder="Responsável comercial"
                  value={form.commercial}
                  onChange={(e) => setForm((f) => ({ ...f, commercial: e.target.value }))}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              placeholder="Informações adicionais..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Auditoria visível no modal (apenas quando editando um registro existente) */}
          {recordId ? (
            <div className="pt-2">
              <div className="mb-2 text-sm font-semibold">Histórico</div>
              <ServiceAuditLog recordId={recordId} />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          <Button onClick={onSave} disabled={saving || !form.client_name.trim()}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}