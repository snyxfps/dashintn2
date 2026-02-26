import React from "react";
import type { RecordStatus } from "@/types";
import { STATUS_CONFIG } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ServiceFilters({
  allowedStatusOptions,
  filterStatus,
  setFilterStatus,
  filterOwner,
  setFilterOwner,
}: {
  allowedStatusOptions: RecordStatus[];
  filterStatus: RecordStatus | "ALL";
  setFilterStatus: (v: RecordStatus | "ALL") => void;
  filterOwner: string;
  setFilterOwner: (v: string) => void;
}) {
  return (
    <div className="corp-card p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {allowedStatusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Responsável</Label>
          <Input placeholder="Filtrar por responsável..." value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} />
        </div>
      </div>
    </div>
  );
}
