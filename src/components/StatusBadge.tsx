import React from 'react';
import { RecordStatus, STATUS_CONFIG } from '@/types';

interface StatusBadgeProps {
  status: RecordStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  return (
    <span className={config.className}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${config.dot}`} />
      {config.label}
    </span>
  );
};
