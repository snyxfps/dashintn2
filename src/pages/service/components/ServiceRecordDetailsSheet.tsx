import React from "react";
import type { ServiceRecord } from "@/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import {
  User,
  Calendar,
  Ticket,
  Layers,
  Clock,
  CheckCircle2,
  RotateCcw,
  MessageSquare,
  Edit2,
  Trash2,
  Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

function Field({ label, value, icon: Icon, className }: { label: string; value?: React.ReactNode; icon: any; className?: string }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors", className)}>
      <div className="mt-0.5 p-2 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground mb-0.5">{label}</div>
        <div className="text-sm font-bold text-foreground truncate">{value}</div>
      </div>
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
  const isAndamento = record?.status === "ANDAMENTO";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <SheetTitle className="text-xl font-bold truncate">
              {record?.client_name ?? "Detalhes do Registro"}
            </SheetTitle>
            {record && <StatusBadge status={record.status} />}
          </div>
        </SheetHeader>

        {record ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">ID do Registro</span>
                <p className="text-sm font-mono bg-muted p-2 rounded truncate">{record.id}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Responsável</span>
                <p className="text-sm border p-2 rounded">{record.owner}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Ticket Agidesk</span>
                <p className="text-sm border p-2 rounded">{record.agidesk_ticket || "—"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Tipo de Integração</span>
                <p className="text-sm border p-2 rounded">{record.integration_type || "—"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Data de Início</span>
                <p className="text-sm border p-2 rounded">{record.start_date || "—"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Comercial</span>
                <p className="text-sm border p-2 rounded">{record.commercial || "—"}</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Cronograma Adicional</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">Data Cadastro</span>
                  <p className="text-sm border p-2 rounded">{record.cadastro_date || "—"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">Reunião Operacional</span>
                  <p className="text-sm border p-2 rounded">{record.meeting_datetime || "—"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">Conclusão</span>
                  <p className="text-sm border p-2 rounded">{record.end_date || "—"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">Devolução</span>
                  <p className="text-sm border p-2 rounded">{record.devolucao_date || "—"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Observações</span>
              <div className="text-sm border p-3 rounded-md bg-muted/20 min-h-[100px] whitespace-pre-wrap">
                {record.notes || "Sem observações."}
              </div>
            </div>

            {isAdmin && (
              <div className="flex gap-2 pt-6 border-t mt-8">
                <Button className="flex-1" onClick={() => onEdit(record)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button variant="destructive" onClick={() => onAskDelete(record.id)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            Selecione um registro para ver os detalhes.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}