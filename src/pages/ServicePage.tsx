import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ServiceRecord, Service, RecordStatus, STATUS_CONFIG, STATUS_OPTIONS } from '@/types';
import { AppHeader } from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { StatusSelect } from '@/components/StatusSelect';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateOnlyBR, todayDateOnlyLocal } from '@/lib/dateOnly';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  Plus, Edit2, Trash2, Filter, Users, Activity, CheckCircle, XCircle, RotateCcw, CalendarDays, BarChart3, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const STATUS_COLORS: Record<RecordStatus, string> = {
  NOVO: '#94a3b8',
  REUNIAO: '#a78bfa',
  ANDAMENTO: '#3b82f6',
  FINALIZADO: '#22c55e',
  CANCELADO: '#ef4444',
  DEVOLVIDO: '#f97316',
};

interface OutletContext { onMenuClick: () => void; }

interface ServicePageProps {
  serviceName: string;
}

const makeEmptyForm = (serviceName: string) => ({
  client_name: '',
  // DATE-only: manter em YYYY-MM-DD no fuso local (evita “voltar um dia”)
  start_date: todayDateOnlyLocal(),
  // Regras no banco: NOVO/REUNIAO só para RC-V.
  status: (serviceName === 'RC-V' ? 'NOVO' : 'ANDAMENTO') as RecordStatus,
  owner: '',
  notes: '',
  // Campos adicionais
  agidesk_ticket: '',
  cadastro_date: '',
  meeting_datetime: '',
  integration_type: '',
  end_date: '',
  devolucao_date: '',
  commercial: '',
});

function DroppableColumn({
  id,
  children,
}: {
  id: RecordStatus;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn("rounded-xl transition", isOver && "ring-2 ring-primary/40")}
    >
      {children}
    </div>
  );
}

function DraggableCard({
  id,
  children,
  disabled,
}: {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled,
  });

  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-60")}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

export const ServicePage: React.FC<ServicePageProps> = ({ serviceName }) => {
  const { onMenuClick } = useOutletContext<OutletContext>();
  const { isAdmin } = useAuth();

  const [service, setService] = useState<Service | null>(null);
  const [serviceMissing, setServiceMissing] = useState(false);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<RecordStatus | 'ALL'>('ALL');
  const [filterOwner, setFilterOwner] = useState('');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ServiceRecord | null>(null);
  const [form, setForm] = useState(() => makeEmptyForm(serviceName));
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // UI
  const [showChart, setShowChart] = useState(false);

  // Drag “pendente” (quando precisa preencher campo obrigatório antes de efetivar)
  const [pendingMove, setPendingMove] = useState<{ id: string; to: RecordStatus } | null>(null);

  // DnD
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Ajuda a não "arrastar sem querer" quando a pessoa só quer clicar
      activationConstraint: { distance: 8 },
    })
  );

  const fetchData = async () => {
    setLoading(true);
    setServiceMissing(false);

    const { data: svc, error: svcErr } = await supabase
      .from('services')
      .select('*')
      .eq('name', serviceName)
      .single();

    if (svcErr || !svc) {
      setService(null);
      setServiceMissing(true);
      setLoading(false);
      return;
    }

    setService(svc as Service);

    const { data: recs } = await supabase
      .from('records')
      .select('*')
      .eq('service_id', svc.id)
      .order('created_at', { ascending: false });

    setRecords((recs as ServiceRecord[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    // ao trocar de rota/serviço, reseta o form para o status default correto
    setForm(makeEmptyForm(serviceName));
    setEditRecord(null);
    setDialogOpen(false);
    setPendingMove(null);
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceName]);

  const handleCreateService = async () => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase.from('services').insert({ name: serviceName, description: null });
      if (error) throw error;
      toast.success('Serviço criado!');
      fetchData();
    } catch (e: unknown) {
      toast.error('Erro ao criar serviço: ' + (e instanceof Error ? e.message : 'Tente novamente'));
    }
  };

  const filtered = records.filter(r => {
    const matchSearch = !search || r.client_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || r.status === filterStatus;
    const matchOwner = !filterOwner || (r.owner || '').toLowerCase().includes(filterOwner.toLowerCase());
    return matchSearch && matchStatus && matchOwner;
  });

  // Status permitidos por serviço (regras no banco)
  const allowedStatusOptions: RecordStatus[] = serviceName === 'RC-V'
    ? STATUS_OPTIONS
    : STATUS_OPTIONS.filter(s => s !== 'NOVO' && s !== 'REUNIAO');

  // Kanban columns (sempre na ordem desejada)
  const kanbanCols: { status: RecordStatus; label: string }[] = [
    { status: 'NOVO', label: 'Novos Clientes' },
    { status: 'REUNIAO', label: 'Reuniões' },
    { status: 'ANDAMENTO', label: 'Em Andamento' },
    { status: 'FINALIZADO', label: 'Finalizados' },
    { status: 'CANCELADO', label: 'Cancelados' },
    { status: 'DEVOLVIDO', label: 'Devolvidos' },
  ];

  const visibleKanbanCols = useMemo(
    () => kanbanCols.filter(c => allowedStatusOptions.includes(c.status)),
    [allowedStatusOptions]
  );

  // KPIs
  const kpis = [
    { label: 'Total no mês', value: records.length, icon: Users, colorVar: 'var(--status-andamento)', bgVar: 'var(--status-andamento-bg)' },
    { label: 'Em Andamento', value: records.filter(r => r.status === 'ANDAMENTO').length, icon: Activity, colorVar: 'var(--status-andamento)', bgVar: 'var(--status-andamento-bg)' },
    { label: 'Finalizados', value: records.filter(r => r.status === 'FINALIZADO').length, icon: CheckCircle, colorVar: 'var(--status-finalizado)', bgVar: 'var(--status-finalizado-bg)' },
    { label: 'Devolvidos', value: records.filter(r => r.status === 'DEVOLVIDO').length, icon: RotateCcw, colorVar: 'var(--status-devolvido)', bgVar: 'var(--status-devolvido-bg)' },
    { label: 'Cancelados', value: records.filter(r => r.status === 'CANCELADO').length, icon: XCircle, colorVar: 'var(--status-cancelado)', bgVar: 'var(--status-cancelado-bg)' },
  ];

  // Status chart
  const statusChartData = useMemo(() => (
    allowedStatusOptions.map(s => ({
      name: STATUS_CONFIG[s].label,
      count: records.filter(r => r.status === s).length,
      color: STATUS_COLORS[s],
    }))
  ), [records, allowedStatusOptions]);

  const openAdd = () => {
    setEditRecord(null);
    setForm(makeEmptyForm(serviceName));
    setDialogOpen(true);
    setPendingMove(null);
  };

  const openEdit = (r: ServiceRecord) => {
    setEditRecord(r);
    setForm({
      ...makeEmptyForm(serviceName),
      client_name: r.client_name,
      start_date: r.start_date,
      status: r.status,
      owner: r.owner,
      notes: r.notes || '',
      agidesk_ticket: r.agidesk_ticket || '',
      cadastro_date: r.cadastro_date || '',
      meeting_datetime: r.meeting_datetime || '',
      integration_type: r.integration_type || '',
      end_date: r.end_date || '',
      devolucao_date: r.devolucao_date || '',
      commercial: r.commercial || '',
    });
    setDialogOpen(true);
  };

  // === Validação “espelhando” triggers do banco ===
  // Retorna lista de campos obrigatórios faltando para permitir o status
  const missingFieldsForStatus = (r: ServiceRecord, toStatus: RecordStatus): string[] => {
    const missing: string[] = [];

    if (serviceName !== 'RC-V' && (toStatus === 'NOVO' || toStatus === 'REUNIAO')) {
      missing.push('Status NOVO/REUNIÃO só é permitido no serviço RC-V');
      return missing;
    }

    if (toStatus === 'NOVO') {
      if (!String(r.agidesk_ticket || '').trim()) missing.push('Chamado Agidesk');
      if (!String(r.cadastro_date || '').trim()) missing.push('Data de cadastro');
    }

    if (toStatus === 'REUNIAO') {
      if (!String(r.meeting_datetime || '').trim()) missing.push('Data/hora da reunião');
    }

    if (toStatus === 'FINALIZADO' || toStatus === 'CANCELADO') {
      if (!String(r.end_date || '').trim()) missing.push('Data fim');
    }

    if (toStatus === 'DEVOLVIDO') {
      if (!String(r.devolucao_date || '').trim()) missing.push('Data da devolução');
      if (!String(r.commercial || '').trim()) missing.push('Comercial');
    }

    if (serviceName === 'RC-V' && ['ANDAMENTO', 'FINALIZADO', 'CANCELADO'].includes(toStatus)) {
      if (!String(r.integration_type || '').trim()) missing.push('Tipo de Integração');
    }

    return missing;
  };

  const handleSave = async () => {
    if (!form.client_name.trim()) { toast.error('Informe o nome do cliente'); return; }
    if (!service) { toast.error('Serviço não carregado'); return; }

    // Validações espelhando as regras do banco (para evitar “salva e dá erro”)
    if (serviceName !== 'RC-V' && (form.status === 'NOVO' || form.status === 'REUNIAO')) {
      toast.error('Status NOVO/REUNIÃO só é permitido no serviço RC-V');
      return;
    }
    if (form.status === 'NOVO') {
      if (!String(form.agidesk_ticket || '').trim()) { toast.error('Chamado Agidesk é obrigatório para NOVO'); return; }
      if (!String(form.cadastro_date || '').trim()) { toast.error('Data de Cadastro é obrigatória para NOVO'); return; }
    }
    if (form.status === 'REUNIAO') {
      if (!String(form.meeting_datetime || '').trim()) { toast.error('Data/hora reunião é obrigatória para REUNIÃO'); return; }
    }
    if (form.status === 'FINALIZADO' || form.status === 'CANCELADO') {
      if (!String(form.end_date || '').trim()) { toast.error('Data fim é obrigatória para ' + form.status); return; }
    }
    if (form.status === 'DEVOLVIDO') {
      if (!String(form.devolucao_date || '').trim()) { toast.error('Data da devolução é obrigatória para DEVOLVIDO'); return; }
      if (!String(form.commercial || '').trim()) { toast.error('Comercial é obrigatório para DEVOLVIDO'); return; }
    }
    if (serviceName === 'RC-V' && ['ANDAMENTO', 'FINALIZADO', 'CANCELADO'].includes(form.status)) {
      if (!String(form.integration_type || '').trim()) { toast.error('Tipo de Integração é obrigatório para RC-V'); return; }
    }

    setSaving(true);
    try {
      if (editRecord) {
        const payload: any = { ...form };
        // evitar enviar strings vazias em campos DATE/TIMESTAMPTZ
        ['cadastro_date', 'end_date', 'devolucao_date'].forEach(k => { if (!payload[k]) payload[k] = null; });
        if (!payload.meeting_datetime) payload.meeting_datetime = null;

        const { error } = await supabase
          .from('records')
          .update(payload)
          .eq('id', editRecord.id)
          .select('id')
          .single();

        if (error) throw error;
        toast.success('Registro atualizado!');
      } else {
        const payload: any = { ...form, service_id: service.id };
        ['cadastro_date', 'end_date', 'devolucao_date'].forEach(k => { if (!payload[k]) payload[k] = null; });
        if (!payload.meeting_datetime) payload.meeting_datetime = null;

        const { error } = await supabase
          .from('records')
          .insert(payload)
          .select('id')
          .single();

        if (error) throw error;
        toast.success('Registro adicionado!');
      }

      await fetchData();
      setDialogOpen(false);
      setEditRecord(null);
      setForm(makeEmptyForm(serviceName));
      setPendingMove(null);
    } catch (e: unknown) {
      toast.error('Erro ao salvar: ' + (e instanceof Error ? e.message : 'Tente novamente'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('records').delete().eq('id', deleteId);
    if (error) toast.error('Erro ao excluir');
    else { toast.success('Registro excluído!'); fetchData(); }
    setDeleteId(null);
  };

  const handleStatusChange = async (id: string, status: RecordStatus) => {
    // regra: fora do RC-V não pode NOVO/REUNIAO
    if (serviceName !== 'RC-V' && (status === 'NOVO' || status === 'REUNIAO')) {
      toast.error('Status NOVO/REUNIÃO só é permitido no serviço RC-V');
      return;
    }

    const { error } = await supabase.from('records').update({ status }).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      fetchData();
    }
  };

  const owners = [...new Set(records.map(r => r.owner).filter(Boolean))];

  const onDragStart = (e: DragStartEvent) => {
    setActiveDragId(String(e.active.id));
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    if (!isAdmin) return;

    const { active, over } = e;
    if (!over) return;

    const recordId = String(active.id);
    const newStatus = String(over.id) as RecordStatus;

    const current = records.find(r => r.id === recordId);
    if (!current) return;
    if (current.status === newStatus) return;

    // Só permite soltar em status válidos para o serviço
    if (!allowedStatusOptions.includes(newStatus)) {
      toast.error('Status não permitido para este serviço.');
      return;
    }

    // Se o status destino exige campos, abre modal e deixa o usuário preencher
    const missing = missingFieldsForStatus(current, newStatus);
    if (missing.length > 0) {
      toast.message(`Para mover para "${STATUS_CONFIG[newStatus].label}", preencha: ${missing.join(', ')}`);

      openEdit(current);

      // força o status e dá defaults úteis (sem salvar sozinho)
      setForm(f => ({
        ...f,
        status: newStatus,
        end_date: (newStatus === 'FINALIZADO' || newStatus === 'CANCELADO')
          ? (f.end_date || todayDateOnlyLocal())
          : f.end_date,
        devolucao_date: (newStatus === 'DEVOLVIDO')
          ? (f.devolucao_date || todayDateOnlyLocal())
          : f.devolucao_date,
      }));

      setPendingMove({ id: recordId, to: newStatus });
      return;
    }

    // Se não falta nada, atualiza direto
    handleStatusChange(recordId, newStatus);
  };

  const activeRecord = useMemo(
    () => (activeDragId ? records.find(r => r.id === activeDragId) : null),
    [activeDragId, records]
  );

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
            <Button size="sm" onClick={openAdd} className="h-9">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Adicionar
            </Button>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {serviceMissing && (
              <div className="p-6 rounded-xl border bg-card">
                <h2 className="text-lg font-semibold">Serviço não encontrado</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  O serviço <span className="font-medium">{serviceName}</span> não existe no seu Supabase.
                </p>
                {isAdmin ? (
                  <div className="mt-4">
                    <Button onClick={handleCreateService}>Criar serviço</Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-4">Peça para um administrador criar este serviço.</p>
                )}
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {kpis.map(kpi => (
                <div key={kpi.label} className="kpi-card">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: `hsl(${kpi.bgVar})`, color: `hsl(${kpi.colorVar})` }}
                  >
                    <kpi.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
                    <div className="text-xs text-muted-foreground">{kpi.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Kanban */}
            <div className="corp-card p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold text-foreground">Kanban por status</h3>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                  {visibleKanbanCols.map(col => {
                    const colRecords = records.filter(r => r.status === col.status);
                    const cfg = STATUS_CONFIG[col.status];

                    return (
                      <div key={col.status} className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={cfg.className}>{cfg.label}</span>
                          <span className="text-xs text-muted-foreground">({colRecords.length})</span>
                        </div>

                        <DroppableColumn id={col.status}>
                          <div className="space-y-2 min-h-[80px]">
                            {colRecords.map(r => (
                              <DraggableCard key={r.id} id={r.id} disabled={!isAdmin}>
                                <div
                                  className={cn(
                                    "corp-card p-3 hover:shadow-md transition-shadow",
                                    isAdmin ? "cursor-pointer" : "cursor-default"
                                  )}
                                  onClick={() => { if (isAdmin) openEdit(r); }}
                                >
                                  <div className="text-xs font-semibold text-foreground leading-tight mb-1">
                                    {r.client_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">{r.owner}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {formatDateOnlyBR(r.start_date)}
                                  </div>
                                </div>
                              </DraggableCard>
                            ))}

                            {colRecords.length === 0 && (
                              <div className="h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                                Vazio
                              </div>
                            )}
                          </div>
                        </DroppableColumn>
                      </div>
                    );
                  })}
                </div>

                <DragOverlay>
                  {activeRecord ? (
                    <div className="corp-card p-3 w-56 shadow-lg">
                      <div className="text-xs font-semibold text-foreground leading-tight mb-1">
                        {activeRecord.client_name}
                      </div>
                      <div className="text-xs text-muted-foreground">{activeRecord.owner}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDateOnlyBR(activeRecord.start_date)}
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>

            {/* Chart (abaixo e opcional) */}
            {showChart && (
              <div className="corp-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Quantidade por status</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={statusChartData} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(220 15% 92%)" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(220 15% 50%)' }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220 15% 50%)' }} width={120} />
                    <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {statusChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Filters + Table */}
            <div className="corp-card overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-border">
                <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />

                <Select value={filterStatus} onValueChange={v => setFilterStatus(v as RecordStatus | 'ALL')}>
                  <SelectTrigger className="h-8 w-40 text-xs">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os status</SelectItem>
                    {allowedStatusOptions.map(s => (
                      <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterOwner || 'ALL'} onValueChange={v => setFilterOwner(v === 'ALL' ? '' : v)}>
                  <SelectTrigger className="h-8 w-40 text-xs">
                    <SelectValue placeholder="Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    {owners.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>

                <div className="ml-auto text-xs text-muted-foreground">
                  {filtered.length} de {records.length} registros
                </div>
              </div>

              <div className="overflow-x-auto">
                <TooltipProvider delayDuration={200}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Cliente</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3">Status</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 hidden sm:table-cell">Responsável</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 hidden md:table-cell">Data início</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 hidden lg:table-cell">Observações</th>
                        {isAdmin && <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3">Ações</th>}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-border">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={isAdmin ? 6 : 5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                            Nenhum registro encontrado.
                          </td>
                        </tr>
                      ) : filtered.map(r => {
                        const notes = (r.notes || '').trim();

                        return (
                          <tr
                            key={r.id}
                            className={cn("table-row-hover", isAdmin && "cursor-pointer")}
                            onClick={() => { if (isAdmin) openEdit(r); }}
                          >
                            <td className="px-5 py-3 font-medium text-foreground">{r.client_name}</td>

                            {/* ✅ evita cortar status/trigger */}
                            <td className="px-3 py-3 min-w-[190px]">
                              {isAdmin ? (
                                <StatusSelect
                                  value={r.status}
                                  onChange={s => handleStatusChange(r.id, s)}
                                  allowedStatuses={allowedStatusOptions}
                                />
                              ) : (
                                <StatusBadge status={r.status} />
                              )}
                            </td>

                            <td className="px-3 py-3 text-muted-foreground text-xs hidden sm:table-cell">{r.owner || '-'}</td>

                            <td className="px-3 py-3 text-muted-foreground text-xs hidden md:table-cell">
                              <div className="flex items-center gap-1.5">
                                <CalendarDays className="w-3 h-3" />
                                {formatDateOnlyBR(r.start_date)}
                              </div>
                            </td>

                            <td className="px-3 py-3 text-muted-foreground text-xs hidden lg:table-cell max-w-[380px]">
                              {notes ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="line-clamp-2 whitespace-normal break-words">
                                      {notes}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[520px] whitespace-pre-wrap break-words text-xs">
                                    {notes}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                '-'
                              )}
                            </td>

                            {isAdmin && (
                              <td className="px-5 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>

                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TooltipProvider>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editRecord ? 'Editar Registro' : 'Novo Registro'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do cliente *</Label>
              <Input
                placeholder="Nome da empresa/cliente"
                value={form.client_name}
                onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
              />
            </div>

            {/* Campos obrigatórios para NOVO (RC-V) */}
            {form.status === 'NOVO' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Chamado Agidesk *</Label>
                  <Input
                    placeholder="Ex: AGI-12345"
                    value={form.agidesk_ticket}
                    onChange={e => setForm(f => ({ ...f, agidesk_ticket: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Data de cadastro *</Label>
                  <Input
                    type="date"
                    value={form.cadastro_date}
                    onChange={e => setForm(f => ({ ...f, cadastro_date: e.target.value, start_date: e.target.value || f.start_date }))}
                  />
                </div>
              </div>
            )}

            {/* Campo obrigatório para REUNIÃO (RC-V) */}
            {form.status === 'REUNIAO' && (
              <div className="space-y-1.5">
                <Label>Data/hora da reunião *</Label>
                <Input
                  type="datetime-local"
                  value={form.meeting_datetime}
                  onChange={e => {
                    const v = e.target.value;
                    const dateOnly = v ? v.split('T')[0] : '';
                    setForm(f => ({ ...f, meeting_datetime: v, start_date: dateOnly || f.start_date }));
                  }}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data de início *</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status *</Label>
                <Select
                  value={form.status}
                  onValueChange={v => setForm(f => ({ ...f, status: v as RecordStatus }))}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedStatusOptions.map(s => (
                      <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campos por status/serviço */}
            {serviceName === 'RC-V' && ['ANDAMENTO', 'FINALIZADO', 'CANCELADO'].includes(form.status) && (
              <div className="space-y-1.5">
                <Label>Tipo de Integração *</Label>
                <Input
                  placeholder="Ex: API / Webhook / Batch"
                  value={form.integration_type}
                  onChange={e => setForm(f => ({ ...f, integration_type: e.target.value }))}
                />
              </div>
            )}

            {['FINALIZADO', 'CANCELADO'].includes(form.status) && (
              <div className="space-y-1.5">
                <Label>Data fim *</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            )}

            {form.status === 'DEVOLVIDO' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Data da devolução *</Label>
                  <Input
                    type="date"
                    value={form.devolucao_date}
                    onChange={e => setForm(f => ({ ...f, devolucao_date: e.target.value, start_date: e.target.value || f.start_date }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Comercial *</Label>
                  <Input
                    placeholder="Responsável comercial"
                    value={form.commercial}
                    onChange={e => setForm(f => ({ ...f, commercial: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Input
                placeholder="Nome do responsável"
                value={form.owner}
                onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                placeholder="Informações adicionais..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setPendingMove(null); }}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.client_name.trim()}>
              {saving ? 'Salvando...' : editRecord ? 'Salvar alterações' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
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