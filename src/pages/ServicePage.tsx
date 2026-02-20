import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ServiceRecord, Service, RecordStatus, STATUS_CONFIG } from '@/types';
import { AppHeader } from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { StatusSelect } from '@/components/StatusSelect';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  Plus, Edit2, Trash2, Filter, Users, Activity, CheckCircle, XCircle, RotateCcw, CalendarDays
} from 'lucide-react';
import { toast } from 'sonner';

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

type FormState = {
  client_name: string;

  status: RecordStatus;

  // Datas genéricas
  start_date: string;      // Data início (ANDAMENTO/FINALIZADO/CANCELADO) - e fallback
  end_date: string;        // Data fim (FINALIZADO/CANCELADO)

  // RC-V específico: novo cliente
  agidesk_ticket: string;
  cadastro_date: string;   // Data de cadastro (NOVO)

  // RC-V específico: reunião
  meeting_datetime: string; // datetime-local

  // RC-V específico: tipo de integração
  integration_type: string;

  // Devolvido
  devolucao_date: string;
  commercial: string;

  notes: string;
};

const toDate = (d: Date) => d.toISOString().split('T')[0];
const toDateTimeLocal = (d: Date) => {
  // YYYY-MM-DDTHH:mm (sem segundos)
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const diffDaysInclusive = (startISO?: string | null, endISO?: string | null) => {
  if (!startISO) return null;
  const start = new Date(startISO);
  const end = new Date(endISO || new Date().toISOString());
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const ms = end.getTime() - start.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return Math.max(0, days) + 1; // inclusivo
};

const isRcv = (serviceName: string) => serviceName.trim().toUpperCase() === 'RC-V';

export const ServicePage: React.FC<ServicePageProps> = ({ serviceName }) => {
  const { onMenuClick } = useOutletContext<OutletContext>();
  const { isAdmin } = useAuth();
  const rcv = isRcv(serviceName);

  const allowedStatusOptions: RecordStatus[] = useMemo(() => (
    rcv
      ? ['NOVO', 'REUNIAO', 'ANDAMENTO', 'FINALIZADO', 'CANCELADO', 'DEVOLVIDO']
      : ['ANDAMENTO', 'FINALIZADO', 'CANCELADO', 'DEVOLVIDO']
  ), [rcv]);

  const emptyForm: FormState = useMemo(() => {
    const today = toDate(new Date());
    return {
      client_name: '',
      status: rcv ? 'NOVO' : 'ANDAMENTO',
      start_date: today,
      end_date: today,
      agidesk_ticket: '',
      cadastro_date: today,
      meeting_datetime: toDateTimeLocal(new Date()),
      integration_type: '',
      devolucao_date: today,
      commercial: '',
      notes: '',
    };
  }, [rcv]);

  const [service, setService] = useState<Service | null>(null);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<RecordStatus | 'ALL'>('ALL');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ServiceRecord | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data: svc, error: svcErr } = await supabase
      .from('services')
      .select('*')
      .eq('name', serviceName)
      .single();

    if (svcErr || !svc) {
      setService(null);
      setRecords([]);
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

  useEffect(() => { fetchData(); }, [serviceName]);

  const filtered = records.filter(r => {
    const matchSearch = !search || r.client_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // KPIs (simples)
  const kpis = [
    { label: 'Total', value: records.length, icon: Users, colorVar: 'var(--status-andamento)', bgVar: 'var(--status-andamento-bg)' },
    { label: 'Em Andamento', value: records.filter(r => r.status === 'ANDAMENTO').length, icon: Activity, colorVar: 'var(--status-andamento)', bgVar: 'var(--status-andamento-bg)' },
    { label: 'Finalizados', value: records.filter(r => r.status === 'FINALIZADO').length, icon: CheckCircle, colorVar: 'var(--status-finalizado)', bgVar: 'var(--status-finalizado-bg)' },
    { label: 'Devolvidos', value: records.filter(r => r.status === 'DEVOLVIDO').length, icon: RotateCcw, colorVar: 'var(--status-devolvido)', bgVar: 'var(--status-devolvido-bg)' },
    { label: 'Cancelados', value: records.filter(r => r.status === 'CANCELADO').length, icon: XCircle, colorVar: 'var(--status-cancelado)', bgVar: 'var(--status-cancelado-bg)' },
  ];

  const statusChartData = allowedStatusOptions.map(s => ({
    name: STATUS_CONFIG[s].label,
    count: records.filter(r => r.status === s).length,
    color: STATUS_COLORS[s],
  }));

  const kanbanCols: { status: RecordStatus; label: string }[] = useMemo(() => (
    rcv
      ? [
        { status: 'NOVO', label: 'Novos Clientes' },
        { status: 'REUNIAO', label: 'Reuniões' },
        { status: 'ANDAMENTO', label: 'Em Andamento' },
        { status: 'FINALIZADO', label: 'Finalizados' },
        { status: 'CANCELADO', label: 'Cancelados' },
        { status: 'DEVOLVIDO', label: 'Devolvidos' },
      ]
      : [
        { status: 'ANDAMENTO', label: 'Em Andamento' },
        { status: 'FINALIZADO', label: 'Finalizados' },
        { status: 'CANCELADO', label: 'Cancelados' },
        { status: 'DEVOLVIDO', label: 'Devolvidos' },
      ]
  ), [rcv]);

  const openAdd = () => {
    setEditRecord(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (r: ServiceRecord) => {
    setEditRecord(r);
    setForm({
      client_name: r.client_name || '',
      status: r.status,
      start_date: r.start_date || toDate(new Date()),
      end_date: (r as any).end_date || (r as any).endDate || toDate(new Date()),
      agidesk_ticket: (r as any).agidesk_ticket || (r as any).agideskTicket || '',
      cadastro_date: (r as any).cadastro_date || (r as any).cadastroDate || r.start_date || toDate(new Date()),
      meeting_datetime: (r as any).meeting_datetime || (r as any).meetingDatetime || toDateTimeLocal(new Date()),
      integration_type: (r as any).integration_type || (r as any).integrationType || '',
      devolucao_date: (r as any).devolucao_date || (r as any).devolucaoDate || toDate(new Date()),
      commercial: (r as any).commercial || '',
      notes: r.notes || '',
    });
    setDialogOpen(true);
  };

  const getDaysForRecord = (r: ServiceRecord) => {
    const start = r.start_date || (r as any).cadastro_date || (r as any).devolucao_date;
    const end = (r as any).end_date;
    if (r.status === 'FINALIZADO' || r.status === 'CANCELADO') return diffDaysInclusive(start, end);
    if (r.status === 'ANDAMENTO') return diffDaysInclusive(start, null);
    return null;
  };

  const getPrimaryDateLabelAndValue = (r: ServiceRecord) => {
    if (r.status === 'NOVO') return { label: 'Cadastro', value: (r as any).cadastro_date || r.start_date };
    if (r.status === 'REUNIAO') return { label: 'Reunião', value: (r as any).meeting_datetime };
    if (r.status === 'DEVOLVIDO') return { label: 'Devolução', value: (r as any).devolucao_date };
    return { label: 'Início', value: r.start_date };
  };

  const buildPayload = () => {
    const s = form.status;

    // validações mínimas (UI)
    if (!form.client_name.trim()) throw new Error('Informe o cliente.');

    // Regras de negócio
    if (!rcv && (s === 'NOVO' || s === 'REUNIAO')) {
      throw new Error('Novo Cliente e Reunião Operacional só podem ser lançados no RC-V.');
    }

    // Monta payload conforme status
    const base: any = {
      client_name: form.client_name.trim(),
      status: s,
      notes: form.notes?.trim() || null,
    };

    if (s === 'NOVO') {
      base.agidesk_ticket = form.agidesk_ticket?.trim() || null;
      base.cadastro_date = form.cadastro_date || null;
      // para manter relatórios consistentes
      base.start_date = form.cadastro_date || form.start_date || toDate(new Date());
    } else if (s === 'REUNIAO') {
      base.meeting_datetime = form.meeting_datetime || null;
      // start_date como data da reunião (para ordenação)
      base.start_date = (form.meeting_datetime ? form.meeting_datetime.split('T')[0] : toDate(new Date()));
    } else if (s === 'ANDAMENTO') {
      base.start_date = form.start_date || null;
      if (rcv) base.integration_type = form.integration_type?.trim() || null;
    } else if (s === 'FINALIZADO' || s === 'CANCELADO') {
      base.start_date = form.start_date || null;
      base.end_date = form.end_date || null;
      if (rcv) base.integration_type = form.integration_type?.trim() || null;
    } else if (s === 'DEVOLVIDO') {
      base.devolucao_date = form.devolucao_date || null;
      base.commercial = form.commercial?.trim() || null;
      base.start_date = form.devolucao_date || form.start_date || toDate(new Date());
    }

    // validações específicas por status (hard UI)
    if (s === 'NOVO' && (!base.cadastro_date || !base.agidesk_ticket)) {
      throw new Error('Para Novo Cliente (RC-V): informe Chamado Agidesk e Data de Cadastro.');
    }
    if (s === 'REUNIAO' && !base.meeting_datetime) {
      throw new Error('Para Reunião Operacional (RC-V): informe Data/Hora da reunião.');
    }
    if (s === 'ANDAMENTO' && !base.start_date) {
      throw new Error('Informe a Data de Início.');
    }
    if ((s === 'FINALIZADO' || s === 'CANCELADO') && (!base.start_date || !base.end_date)) {
      throw new Error('Informe Data de Início e Data de Fim.');
    }
    if (s === 'DEVOLVIDO' && (!base.devolucao_date || !base.commercial)) {
      throw new Error('Para Devolvido: informe Data da Devolução e Comercial.');
    }

    return base;
  };

  const handleSave = async () => {
    if (!service) return;
    setSaving(true);
    try {
      const payload = buildPayload();

      if (editRecord) {
        const { error } = await supabase
          .from('records')
          .update({ ...payload })
          .eq('id', editRecord.id);

        if (error) throw error;
        toast.success('Registro atualizado!');
      } else {
        const { error } = await supabase
          .from('records')
          .insert({ ...payload, service_id: service.id });

        if (error) throw error;
        toast.success('Registro adicionado!');
      }

      setDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message ?? 'Tente novamente'));
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
    // regra: NOVO/REUNIAO só RC-V
    if (!rcv && (status === 'NOVO' || status === 'REUNIAO')) {
      toast.error('Novo Cliente e Reunião só podem ser usados no RC-V.');
      return;
    }
    const { error } = await supabase.from('records').update({ status }).eq('id', id);
    if (error) toast.error('Erro ao atualizar status');
    else fetchData();
  };

  const renderDialogFields = () => {
    const s = form.status;

    const daysPreview = (() => {
      if (s === 'ANDAMENTO') return diffDaysInclusive(form.start_date, null);
      if (s === 'FINALIZADO' || s === 'CANCELADO') return diffDaysInclusive(form.start_date, form.end_date);
      return null;
    })();

    return (
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label>Cliente *</Label>
          <Input
            placeholder="Nome do cliente"
            value={form.client_name}
            onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Status *</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as RecordStatus }))}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedStatusOptions.map(sx => (
                <SelectItem key={sx} value={sx}>{STATUS_CONFIG[sx].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* NOVO (RC-V) */}
        {s === 'NOVO' && (
          <>
            <div className="space-y-1.5">
              <Label>Chamado Agidesk *</Label>
              <Input
                placeholder="Ex.: AGI-12345"
                value={form.agidesk_ticket}
                onChange={e => setForm(f => ({ ...f, agidesk_ticket: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data de Cadastro *</Label>
              <Input
                type="date"
                value={form.cadastro_date}
                onChange={e => setForm(f => ({ ...f, cadastro_date: e.target.value }))}
              />
            </div>
          </>
        )}

        {/* REUNIAO (RC-V) */}
        {s === 'REUNIAO' && (
          <>
            <div className="space-y-1.5">
              <Label>Data/hora reunião *</Label>
              <Input
                type="datetime-local"
                value={form.meeting_datetime}
                onChange={e => setForm(f => ({ ...f, meeting_datetime: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                placeholder="Pontos discutidos, decisões, pendências..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="resize-none"
              />
            </div>
          </>
        )}

        {/* ANDAMENTO */}
        {s === 'ANDAMENTO' && (
          <>
            {rcv && (
              <div className="space-y-1.5">
                <Label>Tipo de Integração *</Label>
                <Input
                  placeholder="Ex.: API, SFTP, Webhook..."
                  value={form.integration_type}
                  onChange={e => setForm(f => ({ ...f, integration_type: e.target.value }))}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Data Início *</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dias corridos</Label>
              <Input value={daysPreview ? String(daysPreview) : '-'} disabled />
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
          </>
        )}

        {/* FINALIZADO / CANCELADO */}
        {(s === 'FINALIZADO' || s === 'CANCELADO') && (
          <>
            {rcv && (
              <div className="space-y-1.5">
                <Label>Tipo de Integração *</Label>
                <Input
                  placeholder="Ex.: API, SFTP, Webhook..."
                  value={form.integration_type}
                  onChange={e => setForm(f => ({ ...f, integration_type: e.target.value }))}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data início *</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data fim *</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Dias corridos</Label>
              <Input value={daysPreview ? String(daysPreview) : '-'} disabled />
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
          </>
        )}

        {/* DEVOLVIDO */}
        {s === 'DEVOLVIDO' && (
          <>
            <div className="space-y-1.5">
              <Label>Data da devolução *</Label>
              <Input
                type="date"
                value={form.devolucao_date}
                onChange={e => setForm(f => ({ ...f, devolucao_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Comercial *</Label>
              <Input
                placeholder="Nome do comercial"
                value={form.commercial}
                onChange={e => setForm(f => ({ ...f, commercial: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                placeholder="Motivo da devolução, próximos passos..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="resize-none"
              />
            </div>
          </>
        )}
      </div>
    );
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
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {kpis.map(kpi => (
                <div key={kpi.label} className="kpi-card">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: `hsl(${kpi.bgVar})`, color: `hsl(${kpi.colorVar})` }}>
                    <kpi.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
                    <div className="text-xs text-muted-foreground">{kpi.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Kanban + Chart */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Kanban */}
              <div className="xl:col-span-2">
                <h3 className="text-sm font-semibold text-foreground mb-3">Kanban por status</h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {kanbanCols.map(col => {
                    const colRecords = records.filter(r => r.status === col.status);
                    const cfg = STATUS_CONFIG[col.status];
                    return (
                      <div key={col.status} className="flex-shrink-0 w-56">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={cfg.className}>{cfg.label}</span>
                          <span className="text-xs text-muted-foreground">({colRecords.length})</span>
                        </div>
                        <div className="space-y-2 min-h-[60px]">
                          {colRecords.map(r => {
                            const primary = getPrimaryDateLabelAndValue(r);
                            const days = getDaysForRecord(r);
                            return (
                              <div key={r.id} className="corp-card p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => isAdmin && openEdit(r)}>
                                <div className="text-xs font-semibold text-foreground leading-tight mb-1">{r.client_name}</div>

                                {col.status === 'NOVO' && (
                                  <div className="text-xs text-muted-foreground">
                                    Agidesk: {(r as any).agidesk_ticket || '-'}
                                  </div>
                                )}

                                {col.status === 'DEVOLVIDO' && (
                                  <div className="text-xs text-muted-foreground">
                                    Comercial: {(r as any).commercial || '-'}
                                  </div>
                                )}

                                {col.status === 'ANDAMENTO' && rcv && (
                                  <div className="text-xs text-muted-foreground">
                                    Tipo: {(r as any).integration_type || '-'}
                                  </div>
                                )}

                                <div className="text-xs text-muted-foreground mt-1">
                                  {primary?.value
                                    ? (primary.label === 'Reunião'
                                      ? new Date(primary.value).toLocaleString('pt-BR')
                                      : new Date(primary.value).toLocaleDateString('pt-BR'))
                                    : '-'}
                                </div>

                                {(days !== null && (col.status === 'ANDAMENTO' || col.status === 'FINALIZADO' || col.status === 'CANCELADO')) && (
                                  <div className="text-[11px] text-muted-foreground mt-1">
                                    Dias corridos: <span className="font-semibold text-foreground">{days}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {colRecords.length === 0 && (
                            <div className="h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                              Vazio
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart */}
              <div className="corp-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Quantidade por status</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={statusChartData} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(220 15% 92%)" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(220 15% 50%)' }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'hsl(220 15% 50%)' }} width={100} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {statusChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Filters + Table */}
            <div className="corp-card overflow-hidden">
              {/* Filter bar */}
              <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-border">
                <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />

                <Select value={filterStatus} onValueChange={v => setFilterStatus(v as RecordStatus | 'ALL')}>
                  <SelectTrigger className="h-8 w-56 text-xs">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os status</SelectItem>
                    {allowedStatusOptions.map(s => (
                      <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="ml-auto text-xs text-muted-foreground">
                  {filtered.length} de {records.length} registros
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Cliente</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3">Status</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3">Detalhes</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 hidden md:table-cell">Dias corridos</th>
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
                      const primary = getPrimaryDateLabelAndValue(r);
                      const days = getDaysForRecord(r);
                      const details = (() => {
                        if (r.status === 'NOVO') return `Agidesk: ${(r as any).agidesk_ticket || '-'}`;
                        if (r.status === 'REUNIAO') return `Reunião: ${primary?.value ? new Date(primary.value).toLocaleString('pt-BR') : '-'}`;
                        if (r.status === 'DEVOLVIDO') return `Devolução: ${(r as any).devolucao_date ? new Date((r as any).devolucao_date).toLocaleDateString('pt-BR') : '-'} • Comercial: ${(r as any).commercial || '-'}`;
                        if (r.status === 'ANDAMENTO') {
                          const d = primary?.value ? new Date(primary.value).toLocaleDateString('pt-BR') : '-';
                          return rcv ? `Tipo: ${(r as any).integration_type || '-'} • Início: ${d}` : `Início: ${d}`;
                        }
                        if (r.status === 'FINALIZADO' || r.status === 'CANCELADO') {
                          const ini = r.start_date ? new Date(r.start_date).toLocaleDateString('pt-BR') : '-';
                          const fim = (r as any).end_date ? new Date((r as any).end_date).toLocaleDateString('pt-BR') : '-';
                          return rcv
                            ? `Tipo: ${(r as any).integration_type || '-'} • Início: ${ini} • Fim: ${fim}`
                            : `Início: ${ini} • Fim: ${fim}`;
                        }
                        return primary?.value ? `${primary.label}: ${new Date(primary.value).toLocaleDateString('pt-BR')}` : '-';
                      })();

                      return (
                        <tr key={r.id} className="table-row-hover">
                          <td className="px-5 py-3 font-medium text-foreground">{r.client_name}</td>
                          <td className="px-3 py-3">
                            {isAdmin ? (
                              <StatusSelect
                                value={r.status}
                                onChange={s => handleStatusChange(r.id, s)}
                                allowed={allowedStatusOptions}
                              />
                            ) : (
                              <StatusBadge status={r.status} />
                            )}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground text-xs">{details}</td>
                          <td className="px-3 py-3 text-muted-foreground text-xs hidden md:table-cell">
                            {days !== null ? (
                              <div className="flex items-center gap-1.5">
                                <CalendarDays className="w-3 h-3" />
                                {days}
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground text-xs hidden lg:table-cell max-w-[260px] truncate">
                            {r.notes || '-'}
                          </td>
                          {isAdmin && (
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => openEdit(r)}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteId(r.id)}
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
            <DialogDescription>
              Preencha os campos conforme o tipo de registro e o status selecionado.
            </DialogDescription>
          </DialogHeader>

          {renderDialogFields()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
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
