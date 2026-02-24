import React from 'react';
import { RecordStatus, STATUS_CONFIG, STATUS_OPTIONS } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface StatusSelectProps {
  value: RecordStatus;
  onChange: (value: RecordStatus) => void;
  disabled?: boolean;
  /** Se informado, limita quais status aparecem (ex.: regras por serviço) */
  allowedStatuses?: RecordStatus[];
  /** Ajuste opcional de largura quando ficar “cortando” (ex.: Reunião Operacional) */
  className?: string;
}

export const StatusSelect: React.FC<StatusSelectProps> = ({
  value,
  onChange,
  disabled,
  allowedStatuses,
  className,
}) => {
  const options = (allowedStatuses && allowedStatuses.length > 0)
    ? STATUS_OPTIONS.filter(s => allowedStatuses.includes(s))
    : STATUS_OPTIONS;

  const cfg = STATUS_CONFIG[value];

  return (
    <Select value={value} onValueChange={(v) => onChange(v as RecordStatus)} disabled={disabled}>
      <SelectTrigger
        className={cn(
          'h-8 text-xs border-0 bg-transparent p-0 w-full justify-start gap-1 focus:ring-0',
          className
        )}
      >
        <SelectValue>
          <span className={cn(cfg.className, 'inline-flex items-center gap-1 min-w-0')}>
            <span className={cn('inline-block w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
            <span className="truncate">{cfg.label}</span>
          </span>
        </SelectValue>
      </SelectTrigger>

      <SelectContent>
        {options.map(s => {
          const o = STATUS_CONFIG[s];
          return (
            <SelectItem key={s} value={s}>
              <span className={cn(o.className, 'inline-flex items-center gap-1 min-w-0')}>
                <span className={cn('inline-block w-1.5 h-1.5 rounded-full flex-shrink-0', o.dot)} />
                <span className="truncate">{o.label}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
