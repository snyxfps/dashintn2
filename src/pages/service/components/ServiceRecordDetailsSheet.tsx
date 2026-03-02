import React from "react";
import type { ServiceRecord } from "@/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export function ServiceRecordDetailsSheet({
  open,
  onOpenChange,
  record,
  isAdmin,
  onEdit,
  onAskDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: ServiceRecord | null;
  isAdmin: boolean;
  onEdit: (r: ServiceRecord) => void;
  onAskDelete: (id: string) => void;
}) {
  const isReuniao = record?.status === "REUNIAO";
  const isFinalizadoOuCancelado = record?.status === "FINALIZADO" || record?.status === "CANCELADO";
  const isDevolvido = record?.status === "DEVOLVIDO";
  const isNovo = record?.status === "NOVO";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between gap-3">
            <span className="truncate">{record?.client_name ?? "Detalhes"}</span>
            {record ? <StatusBadge status={record.status} /> : null}
          </SheetTitle>
        </SheetHeader>

        {record ? (
          <div className="mt-5 space-y-6">
            {/* Ações (só admin) */}
            {isAdmin ? (
              <div className="flex gap-2">
                <Button variant="default" onClick={() => onEdit(record)}>
                  Editar
                </Button>
                <Button variant="destructive" onClick={() => onAskDelete(record.id)}>
                  Excluir
                </Button>
              </div>
            ) : null}

            {/* Resumo (não mostra em REUNIÃO pra não ficar bloco vazio) */}
            {!isReuniao ? (
              <div className="rounded-xl border p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Responsável" value={record.owner} />
                  <Field label="Data de início" value={record.start_date} />
                  <Field label="Ticket Agidesk" value={record.agidesk_ticket} />
                  <Field label="Tipo de Integração" value={record.integration_type} />
                </div>
              </div>
            ) : null}

            {/* Datas de processo */}
            <div className="rounded-xl border p-4 space-y-3">
              <div className="text-sm font-semibold">{isReuniao ? "Data" : "Datas"}</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Em REUNIÃO: mostrar somente a reunião */}
                {isReuniao ? (
                  <Field label="Reunião" value={record.meeting_datetime} />
                ) : (
                  <>
                    {/* Cadastro só faz sentido em NOVO */}
                    {isNovo ? <Field label="Cadastro" value={record.cadastro_date} /> : null}

                    {/* Se existir, pode mostrar reunião mesmo fora do status REUNIÃO */}
                    <Field label="Reunião" value={record.meeting_datetime} />

                    {/* Conclusão só em FINALIZADO/CANCELADO */}
                    {isFinalizadoOuCancelado ? <Field label="Conclusão" value={record.end_date} /> : null}

                    {/* Devolução + Comercial só em DEVOLVIDO */}
                    {isDevolvido ? (
                      <>
                        <Field label="Devolução" value={record.devolucao_date} />
                        <Field label="Comercial" value={record.commercial} />
                      </>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            {/* Observações */}
            <div className="rounded-xl border p-4 space-y-2">
              <div className="text-sm font-semibold">Observações</div>
              <div className="text-sm whitespace-pre-wrap text-muted-foreground">
                {record.notes?.trim() ? record.notes : "—"}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 text-sm text-muted-foreground">Selecione um card para ver os detalhes.</div>
        )}
      </SheetContent>
    </Sheet>
  );
}