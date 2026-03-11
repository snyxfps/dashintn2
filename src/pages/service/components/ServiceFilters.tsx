import React, { useEffect, useState } from "react";
import type { RecordStatus } from "@/types";
import { STATUS_CONFIG } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, User, X, ChevronDown, Activity, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const hasFilters = filterStatus !== "ALL" || filterOwner.trim() !== "";

  const clearFilters = () => {
    setFilterStatus("ALL");
    setFilterOwner("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden shadow-xl shadow-blue-500/5"
    >
      <div
        className={cn(
          "px-5 py-4 flex items-center justify-between transition-colors",
          isMobile ? "cursor-pointer active:bg-white/5" : "lg:cursor-default"
        )}
        onClick={() => isMobile && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/5 flex items-center justify-center border border-blue-500/20 shadow-inner">
            <Filter className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground uppercase tracking-[0.15em] leading-tight">Filtros de Busca</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5 opacity-60">
              {hasFilters ? "Filtros aplicados" : "Refine sua visualização"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                clearFilters();
              }}
              className="h-8 px-2 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg group animate-in fade-in zoom-in duration-300"
            >
              <X className="w-3 h-3 mr-1.5 transition-transform group-hover:rotate-90" />
              Limpar
            </Button>
          )}

          <div className="lg:hidden">
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5"
            >
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {(isOpen || !isMobile) && (
          <motion.div
            initial={isMobile ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="p-5 border-t border-white/5 bg-black/5 lg:bg-transparent grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/60 ml-1">Status da Etapa</Label>
                <div className="relative group">
                  <Activity className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 z-10 transition-colors group-focus-within:text-blue-500" />
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                    <SelectTrigger className="glass-card border-none h-12 pl-10 font-bold text-xs transition-all focus:ring-2 focus:ring-blue-500/20">
                      <SelectValue placeholder="Selecione um status" />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10 backdrop-blur-xl">
                      <SelectItem value="ALL" className="font-bold text-xs uppercase tracking-widest py-3">Todos os Status</SelectItem>
                      {allowedStatusOptions.map((s) => (
                        <SelectItem key={s} value={s} className="font-bold text-xs uppercase tracking-widest py-3">
                          {STATUS_CONFIG[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/60 ml-1">Responsável Direto</Label>
                <div className="relative group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 transition-colors group-focus-within:text-blue-500" />
                  <Input
                    placeholder="Nome do colaborador..."
                    value={filterOwner}
                    onChange={(e) => setFilterOwner(e.target.value)}
                    className="glass-card border-none h-12 pl-10 font-bold text-xs placeholder:text-muted-foreground/30 transition-all focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {!isMobile && (
                <div className="hidden lg:flex flex-col justify-end pb-0.5">
                  <div className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/30 text-right pr-2">
                    Filtragem Inteligente v2.0
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
