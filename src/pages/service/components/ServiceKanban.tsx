import React, { useMemo, useState } from "react";
import type { RecordStatus, ServiceRecord } from "@/types";
import { STATUS_CONFIG } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusSelect } from "@/components/StatusSelect";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Edit2, Trash2 } from "lucide-react";

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
} from "@dnd-kit/core";

function DroppableColumn({ id, children }: { id: RecordStatus; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn("rounded-xl transition", isOver && "ring-2 ring-primary/40")}>
      {children}
    </div>
  );
}

function DraggableCard({ id, children, disabled }: { id: string; children: React.ReactNode; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled });
  const style: React.CSSProperties = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-60")} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export function ServiceKanban({
  records,
  visibleCols,
  allowedStatusOptions,
  isAdmin,
  onEdit,
  onAskDelete,
  onMove,
}: {
  records: ServiceRecord[];
  visibleCols: { status: RecordStatus; label: string }[];
  allowedStatusOptions: RecordStatus[];
  isAdmin: boolean;
  onEdit: (r: ServiceRecord) => void;
  onAskDelete: (id: string) => void;
  onMove: (recordId: string, newStatus: RecordStatus) => void;
}) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const onDragStart = (e: DragStartEvent) => setActiveDragId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    if (!isAdmin) return;

    const { active, over } = e;
    if (!over) return;

    const recordId = String(active.id);
    const newStatus = String(over.id) as RecordStatus;

    const current = records.find((r) => r.id === recordId);
    if (!current) return;
    if (current.status === newStatus) return;

    if (!allowedStatusOptions.includes(newStatus)) return;

    onMove(recordId, newStatus);
  };

  const activeRecord = useMemo(() => (activeDragId ? records.find((r) => r.id === activeDragId) : null), [activeDragId, records]);

  return (
    <TooltipProvider>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${visibleCols.length}, minmax(0, 1fr))` }}>
          {visibleCols.map((col) => (
            <DroppableColumn key={col.status} id={col.status}>
              <div className="corp-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-foreground">{col.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {records.filter((r) => r.status === col.status).length}
                  </div>
                </div>

                <div className="space-y-2">
                  {records
                    .filter((r) => r.status === col.status)
                    .map((r) => (
                      <DraggableCard key={r.id} id={r.id} disabled={!isAdmin}>
                        <div className="rounded-xl border bg-card p-3 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">{r.client_name}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <StatusBadge status={r.status} />
                                {r.owner ? <span className="text-xs text-muted-foreground">{r.owner}</span> : null}
                              </div>
                            </div>

                            {isAdmin ? (
                              <div className="flex items-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(r)}>
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onAskDelete(r.id)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Excluir</TooltipContent>
                                </Tooltip>
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-3">
                            <StatusSelect value={r.status} onChange={(s) => onMove(r.id, s)} disabled={!isAdmin} />
                          </div>
                        </div>
                      </DraggableCard>
                    ))}
                </div>
              </div>
            </DroppableColumn>
          ))}
        </div>

        <DragOverlay>
          {activeRecord ? (
            <div className="rounded-xl border bg-card p-3 shadow-md w-72">
              <div className="text-sm font-semibold">{activeRecord.client_name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{STATUS_CONFIG[activeRecord.status].label}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </TooltipProvider>
  );
}
