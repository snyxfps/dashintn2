import React from 'react';
import { RecordStatus, STATUS_CONFIG, STATUS_OPTIONS } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StatusSelectProps {
  value: RecordStatus;
  onChange: (value: RecordStatus) => void;
  disabled?: boolean;
}

export const StatusSelect: React.FC<StatusSelectProps> = ({ value, onChange, disabled }) => {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as RecordStatus)} disabled={disabled}>
      <SelectTrigger className="h-8 text-xs border-0 bg-transparent p-0 w-auto gap-1 focus:ring-0">
        <SelectValue>
          <span className={STATUS_CONFIG[value].className}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${STATUS_CONFIG[value].dot}`} />
            {STATUS_CONFIG[value].label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map(s => (
          <SelectItem key={s} value={s}>
            <span className={STATUS_CONFIG[s].className}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${STATUS_CONFIG[s].dot}`} />
              {STATUS_CONFIG[s].label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
