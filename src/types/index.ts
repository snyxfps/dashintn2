export type RecordStatus = 'NOVO' | 'REUNIAO' | 'ANDAMENTO' | 'FINALIZADO' | 'CANCELADO' | 'DEVOLVIDO';

export interface Service {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ServiceRecord {
  id: string;
  service_id: string;
  client_name: string;
  start_date: string;
  status: RecordStatus;
  owner: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'viewer';
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

export const STATUS_CONFIG: { [K in RecordStatus]: { label: string; className: string; dot: string } } = {
  NOVO: {
    label: 'Novo Cliente',
    className: 'status-novo',
    dot: 'bg-[hsl(var(--status-novo))]',
  },
  REUNIAO: {
    label: 'Reunião Operacional',
    className: 'status-reuniao',
    dot: 'bg-[hsl(var(--status-reuniao))]',
  },
  ANDAMENTO: {
    label: 'Em Andamento',
    className: 'status-andamento',
    dot: 'bg-[hsl(var(--status-andamento))]',
  },
  FINALIZADO: {
    label: 'Finalizado',
    className: 'status-finalizado',
    dot: 'bg-[hsl(var(--status-finalizado))]',
  },
  CANCELADO: {
    label: 'Cancelado',
    className: 'status-cancelado',
    dot: 'bg-[hsl(var(--status-cancelado))]',
  },
  DEVOLVIDO: {
    label: 'Devolvido',
    className: 'status-devolvido',
    dot: 'bg-[hsl(var(--status-devolvido))]',
  },
};

export const STATUS_OPTIONS: RecordStatus[] = ['NOVO', 'REUNIAO', 'ANDAMENTO', 'FINALIZADO', 'CANCELADO', 'DEVOLVIDO'];
