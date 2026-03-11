import React, { useMemo, useState } from "react";
import type { RecordStatus, ServiceRecord } from "@/types";
import { STATUS_CONFIG } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Edit2, Trash2, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    <div ref={setNodeRef} className={cn("transition-all duration-300", isOver && "bg-blue-500/5 rounded-2xl shadow-inner")}>
      {children}
    </div>
  );
}

function DraggableCard({ id, children, disabled }: { id: string; children: React.ReactNode; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled });
  const style: React.CSSProperties = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : undefined
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-40 z-50")}
      {...attributes}
      {...listeners}
    >
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
  onOpen,
}: {
  records: ServiceRecord[];
  visibleCols: { status: RecordStatus; label: string }[];
  allowedStatusOptions: RecordStatus[];
  isAdmin: boolean;
  onEdit: (r: ServiceRecord) => void;
  onAskDelete: (id: string) => void;
  onMove: (recordId: string, newStatus: RecordStatus) => void;
  onOpen: (r: ServiceRecord) => void;
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

  const activeRecord = useMemo(
    () => (activeDragId ? records.find((r) => r.id === activeDragId) : null),
    [activeDragId, records]
  );

  return (
    <TooltipProvider>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div
          className="flex lg:grid gap-6 overflow-x-auto pb-6 lg:pb-0 lg:overflow-x-visible items-start scrollbar-none"
          style={{
            gridTemplateColumns: `repeat(${visibleCols.length}, minmax(0, 1fr))`
          }}
        >
          {visibleCols.map((col) => (
            <DroppableColumn key={col.status} id={col.status}>
              <div className="glass-card p-4 min-w-[300px] lg:min-w-0 w-[300px] lg:w-full flex-shrink-0">
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]",
                      STATUS_CONFIG[col.status].dot
                    )} />
                    <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest leading-none">
                      {col.label}
                    </h3>
                  </div>
                  <div className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-full uppercase tracking-tighter tabular-nums">
                    {records.filter((r) => r.status === col.status).length}
                  </div>
                </div>

                <div className="space-y-3 min-h-[300px] lg:min-h-[500px]">
                  {records
                    .filter((r) => r.status === col.status)
                    .map((r) => (
                      <DraggableCard key={r.id} id={r.id} disabled={!isAdmin}>
                        <motion.div
                          layoutId={r.id}
                          whileHover={{ y: -2, scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "group rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur-sm transition-all",
                            "cursor-pointer hover:bg-white/10 hover:border-blue-500/30 active:shadow-inner"
                          )}
                          onClick={() => onOpen(r)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-bold text-foreground group-hover:text-blue-400 transition-colors truncate">
                                {r.client_name}
                              </h4>

                              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                <StatusBadge status={r.status} />
                                {r.owner && (
                                  <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/20">
                                    <div className="w-1 h-1 rounded-full bg-blue-400" />
                                    {r.owner}
                                  </div>
                                )}
                              </div>
                            </div>

                            {isAdmin && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 rounded-xl hover:bg-blue-500/20 hover:text-blue-400"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(r);
                                  }}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 rounded-xl hover:bg-rose-500/20 hover:text-rose-400"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAskDelete(r.id);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Preview da data se existir */}
                          {r.start_date && (
                            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Início</div>
                              <div className="text-[10px] font-black text-foreground">{new Date(r.start_date).toLocaleDateString('pt-BR')}</div>
                            </div>
                          )}
                        </motion.div>
                      </DraggableCard>
                    ))}

                  {records.filter((r) => r.status === col.status).length === 0 && (
                    <div className="h-32 rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30">Vazio</p>
                    </div>
                  )}
                </div>
              </div>
            </DroppableColumn>
          ))}
        </div>

        <DragOverlay dropAnimation={{
          duration: 300,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}>
          {activeRecord ? (
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 shadow-2xl backdrop-blur-xl w-[300px] ring-2 ring-blue-500/20">
              <div className="text-sm font-black text-white uppercase">{activeRecord.client_name}</div>
              <div className="mt-1 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                {STATUS_CONFIG[activeRecord.status].label}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </TooltipProvider>
  );
}