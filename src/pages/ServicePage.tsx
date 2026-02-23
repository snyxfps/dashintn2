import React, { useEffect, useState } from 'react';
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

const emptyForm = {
  client_name: '',
  // DATE-only: manter em YYYY-MM-DD no fuso local (evita “voltar um dia”)
  start_date: todayDateOnlyLocal(),
  status: 'NOVO' as RecordStatus,
  owner: '',
  notes: '',
};

export const ServicePage: React.FC<ServicePageProps> = ({ serviceName }) => {
  const { onMenuClick } = useOutletContext<OutletContext>();
  const { isAdmin } = useAuth();

  const [service, setService] = useState<Service | null>(null);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<RecordStatus | 'ALL'>('ALL');
  const [filterOwner, setFilterOwner] = useState('');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ServiceRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data: svc } = await supabase.from('services').select('*').eq('name', serviceName).single();
    if (!svc) { setLoading(false); return; }
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
    const matchOwner = !filterOwner || r.owner.toLowerCase().includes(filterOwner.toLowerCase());
    return matchSearch && matchStatus && matchOwner;
  });

  // KPIs
  const kpis = [
    { label: 'Total no mês', value: records.length, icon: Users, colorVar: 'var(--status-andamento)', bgVar: 'var(--status-andamento-bg)' },
    { label: 'Em Andamento', value: records.filter(r => r.status === 'ANDAMENTO').length, icon: Activity, colorVar: 'var(--status-andamento)', bgVar: 'var(--status-andamento-bg)' },
    { label: 'Finalizados', value: records.filter(r => r.status === 'FINALIZADO').length, icon: CheckCircle, colorVar: 'var(--status-finalizado)', bgVar: 'var(--status-finalizado-bg)' },
    { label: 'Devolvidos', value: records.filter(r => r.status === 'DEVOLVIDO').length, icon: RotateCcw, colorVar: 'var(--status-devolvido)', bgVar: 'var(--status-devolvido-bg)' },
    { label: 'Cancelados', value: records.filter(r => r.status === 'CANCELADO').length, icon: XCircle, colorVar: 'var(--status-cancelado)', bgVar: 'var(--status-cancelado-bg)' },
  ];

  // Status chart
  const statusChartData = STATUS_OPTIONS.map(s => ({
    name: STATUS_CONFIG[s].label,
    count: records.filter(r => r.status === s).length,
    color: STATUS_COLORS[s],
  }));

  // Kanban columns
  const kanbanCols: { status: RecordStatus; label: string }[] = [
    { status: 'NOVO', label: 'Novos Clientes' },
    { status: 'REUNIAO', label: 'Reuniões' },
    { status: 'ANDAMENTO', label: 'Em Andamento' },
    { status: 'FINALIZADO', label: 'Finalizados' },
    { status: 'CANCELADO', label: 'Cancelados' },
    { status: 'DEVOLVIDO', label: 'Devolvidos' },
  ];

  const openAdd = () => {
    setEditRecord(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (r: ServiceRecord) => {
    setEditRecord(r);
    setForm({ client_name: r.client_name, start_date: r.start_date, status: r.status, owner: r.owner, notes: r.notes || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.client_name.trim() || !service) return;
    setSaving(true);
    try {
      if (editRecord) {
        const { error } = await supabase.from('records').update({ ...form }).eq('id', editRecord.id);
        if (error) throw error;
        toast.success('Registro atualizado!');
      } else {
        const { error } = await supabase.from('records').insert({ ...form, service_id: service.id });
        if (error) throw error;
        toast.success('Registro adicionado!');
      }
      setDialogOpen(false);
      fetchData();
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
    const { error } = await supabase.from('records').update({ status }).eq('id', id);
    if (error) toast.error('Erro ao atualizar status');
    else fetchData();
  };

  const owners = [...new Set(records.map(r => r.owner).filter(Boolean))];

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
                      <div key={col.status} className="flex-shrink-0 w-48">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={cfg.className}>{cfg.label}</span>
                          <span className="text-xs text-muted-foreground">({colRecords.length})</span>
                        </div>
                        <div className="space-y-2 min-h-[60px]">
                          {colRecords.map(r => (
                            <div key={r.id} className="corp-card p-3 cursor-pointer hover:shadow-md transition-shadow">
                              <div className="text-xs font-semibold text-foreground leading-tight mb-1">{r.client_name}</div>
                              <div className="text-xs text-muted-foreground">{r.owner}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatDateOnlyBR(r.start_date)}
                              </div>
                            </div>
                          ))}
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
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'hsl(220 15% 50%)' }} width={90} />
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
                  <SelectTrigger className="h-8 w-40 text-xs">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os status</SelectItem>
                    {STATUS_OPTIONS.map(s => (
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

              {/* Table */}
              <div className="overflow-x-auto">
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
                    ) : filtered.map(r => (
                      <tr key={r.id} className="table-row-hover">
                        <td className="px-5 py-3 font-medium text-foreground">{r.client_name}</td>
                        <td className="px-3 py-3">
                          {isAdmin ? (
                            <StatusSelect value={r.status} onChange={s => handleStatusChange(r.id, s)} />
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
                        <td className="px-3 py-3 text-muted-foreground text-xs hidden lg:table-cell max-w-[200px] truncate">
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
                    ))}
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
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as RecordStatus }))}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
