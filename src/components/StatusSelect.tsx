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
  allowedStatuses?: RecordStatus[];
}

export const StatusSelect: React.FC<StatusSelectProps> = ({
  value,
  onChange,
  disabled,
  allowedStatuses,
}) => {
  const options = allowedStatuses && allowedStatuses.length > 0 ? allowedStatuses : STATUS_OPTIONS;

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as RecordStatus)}
      disabled={disabled}
    >
      <SelectTrigger className={cn(
        "h-8 text-xs border-0 bg-transparent p-0 w-auto gap-1 focus:ring-0",
        "whitespace-nowrap"
      )}>
        <SelectValue>
          <span className={cn(STATUS_CONFIG[value].className, "whitespace-nowrap")}>
            <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1.5", STATUS_CONFIG[value].dot)} />
            {STATUS_CONFIG[value].label}
          </span>
        </SelectValue>
      </SelectTrigger>

      <SelectContent>
        {options.map(s => (
          <SelectItem key={s} value={s}>
            <span className={cn(STATUS_CONFIG[s].className, "whitespace-nowrap")}>
              <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1.5", STATUS_CONFIG[s].dot)} />
              {STATUS_CONFIG[s].label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};