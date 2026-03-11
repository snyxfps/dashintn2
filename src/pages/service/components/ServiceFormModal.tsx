import React from "react";
import type { RecordStatus } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Briefcase, Calendar, FileText, Activity, Layers, Ticket, MessageSquare, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type ServiceFormState = {
  client_name: string;
  owner: string;
  start_date: string;
  status: RecordStatus;
  agidesk_ticket?: string;
  integration_type?: string;
  notes?: string;
  cadastro_date?: string;
  meeting_datetime?: string;
  end_date?: string;
  devolucao_date?: string;
  commercial?: string;
};

export function ServiceFormModal({
  open,
  onOpenChange,
  title,
  form,
  setForm,
  onSave,
  saving,
  isRCV,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  form: ServiceFormState;
  setForm: React.Dispatch<React.SetStateAction<ServiceFormState>>;
  onSave: () => void;
  saving: boolean;
  isRCV: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl glass-card border-none p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 border-b border-white/10 bg-white/5">
          <DialogTitle className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <FileText className="w-5 h-5" />
            </div>
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-none">
          {/* Identificação Principal */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Identificação</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cliente *</Label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-blue-500" />
                  <Input
                    placeholder="Nome da empresa/cliente"
                    value={form.client_name}
                    onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
                    className="pl-10 h-11 bg-white/5 border-white/5 focus:bg-white/10 transition-all rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Status do Fluxo</Label>
                <div className="relative group">
                  <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 transition-colors group-focus-within:text-blue-500" />
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((f) => ({ ...f, status: v as RecordStatus }))}
                  >
                    <SelectTrigger className="pl-10 h-11 bg-white/5 border-white/5 focus:bg-white/10 transition-all rounded-xl font-bold">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      {isRCV ? (
                        <>
                          <SelectItem value="NOVO" className="font-bold">Novo Cliente</SelectItem>
                          <SelectItem value="REUNIAO" className="font-bold">Reunião Operacional</SelectItem>
                        </>
                      ) : null}
                      <SelectItem value="ANDAMENTO" className="font-bold">Em Andamento</SelectItem>
                      <SelectItem value="FINALIZADO" className="font-bold">Finalizado</SelectItem>
                      <SelectItem value="CANCELADO" className="font-bold">Cancelado</SelectItem>
                      <SelectItem value="DEVOLVIDO" className="font-bold">Devolvido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Atribuição e Datas */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Operação</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Responsável Interno</Label>
                <div className="relative group">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-blue-500" />
                  <Input
                    placeholder="Quem cuidará deste cliente?"
                    value={form.owner}
                    onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
                    className="pl-10 h-11 bg-white/5 border-white/5 focus:bg-white/10 transition-all rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Início das Atividades</Label>
                <div className="relative group">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-blue-500" />
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    className="pl-10 h-11 bg-white/5 border-white/5 focus:bg-white/10 transition-all rounded-xl font-bold uppercase text-[10px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Campos Específicos RC-V */}
          {isRCV && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">Gestão RC-V</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Ticket Agidesk</Label>
                  <div className="relative group">
                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Número do chamado"
                      value={form.agidesk_ticket}
                      onChange={(e) => setForm((f) => ({ ...f, agidesk_ticket: e.target.value }))}
                      className="pl-10 h-11 bg-white/5 border-white/5 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo de Integração</Label>
                  <div className="relative group">
                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Ex: API, S3, Webhook"
                      value={form.integration_type}
                      onChange={(e) => setForm((f) => ({ ...f, integration_type: e.target.value }))}
                      className="pl-10 h-11 bg-white/5 border-white/5 rounded-xl font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Campos Dinâmicos por Status */}
          {(form.status === "NOVO" || form.status === "REUNIAO" || form.status === "FINALIZADO" || form.status === "CANCELADO" || form.status === "DEVOLVIDO") && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Marcos do Status</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {form.status === "NOVO" && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data do Cadastro *</Label>
                    <Input
                      type="date"
                      value={form.cadastro_date}
                      onChange={(e) => setForm((f) => ({ ...f, cadastro_date: e.target.value }))}
                      className="h-11 bg-white/5 border-white/5 rounded-xl font-bold uppercase text-[10px]"
                    />
                  </div>
                )}

                {form.status === "REUNIAO" && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Momento da Reunião *</Label>
                    <div className="relative group">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="datetime-local"
                        value={form.meeting_datetime}
                        onChange={(e) => setForm((f) => ({ ...f, meeting_datetime: e.target.value }))}
                        className="pl-10 h-11 bg-white/5 border-white/5 rounded-xl font-bold uppercase text-[10px]"
                      />
                    </div>
                  </div>
                )}

                {(form.status === "FINALIZADO" || form.status === "CANCELADO") && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data de Conclusão *</Label>
                    <Input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                      className="h-11 bg-white/5 border-white/5 rounded-xl font-bold uppercase text-[10px]"
                    />
                  </div>
                )}

                {form.status === "DEVOLVIDO" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data da Devolução *</Label>
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
                        className="h-11 bg-white/5 border-white/5 rounded-xl font-bold uppercase text-[10px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Comercial de Referência *</Label>
                      <Input
                        placeholder="Nome do comercial"
                        value={form.commercial}
                        onChange={(e) => setForm((f) => ({ ...f, commercial: e.target.value }))}
                        className="h-11 bg-white/5 border-white/5 rounded-xl font-bold"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2 pt-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Observações Adicionais</Label>
            <div className="relative group">
              <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-blue-500" />
              <Textarea
                placeholder="Detalhes relevantes sobre o progresso deste cliente..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={4}
                className="pl-10 bg-white/5 border-white/5 focus:bg-white/10 transition-all rounded-2xl font-medium resize-none text-sm leading-relaxed"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t border-white/10 bg-white/5 gap-3 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-11 flex-1 sm:flex-none"
          >
            Cancelar
          </Button>

          <Button
            onClick={onSave}
            disabled={saving || !form.client_name.trim()}
            className="rounded-xl font-black uppercase tracking-widest text-[10px] h-11 flex-1 sm:flex-none bg-blue-500 hover:bg-blue-600 shadow-xl shadow-blue-500/20 px-8"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </div>
            ) : "Confirmar e Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}