import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Layers,
    Users,
    FileCheck,
    Truck,
    History,
    Settings,
    Moon,
    Sun,
    LogOut,
    Search
} from "lucide-react";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { ServiceRecord } from "@/types";

export function CommandMenu() {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<ServiceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { signOut } = useAuth();
    const { setTheme, theme } = useTheme();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        const handleOpenEvent = () => setOpen(true);
        document.addEventListener("open-command-menu", handleOpenEvent);

        document.addEventListener("keydown", down);
        return () => {
            document.removeEventListener("keydown", down);
            document.removeEventListener("open-command-menu", handleOpenEvent);
        };
    }, []);

    useEffect(() => {
        if (!search.trim()) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const { data } = await supabase
                    .from("records")
                    .select("*")
                    .ilike("client_name", `%${search}%`)
                    .limit(8);
                setResults((data as ServiceRecord[]) || []);
            } catch (err) {
                console.error("Search error:", err);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [search]);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput
                placeholder="Digite um comando ou pesquise clientes..."
                value={search}
                onValueChange={setSearch}
            />
            <CommandList>
                {loading && (
                    <div className="flex items-center justify-center py-6">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="ml-2 text-xs text-muted-foreground font-medium">Buscando na base de dados...</span>
                    </div>
                )}

                {!loading && search.length > 0 && results.length === 0 && (
                    <CommandEmpty>Nenhum cliente encontrado para "{search}".</CommandEmpty>
                )}

                {results.length > 0 && (
                    <CommandGroup heading="Resultados (Clientes)">
                        {results.map((r) => (
                            <CommandItem
                                key={r.id}
                                onSelect={() => runCommand(() => {
                                    // Aqui poderíamos abrir o detalhe do registro, mas para agora vamos navegar para o serviço dele
                                    // Como não temos a rota direta para detalhe por ID no momento, vamos para a página do serviço
                                    const path = r.service_id === 'smp' ? '/smp' :
                                        r.service_id === 'multicadastro' ? '/multicadastro' :
                                            r.service_id === 'rcv' ? '/rcv' :
                                                r.service_id === 'tecnologia-logistica' ? '/tecnologia-logistica' :
                                                    '/tecnologia-risco';
                                    navigate(path);
                                })}
                            >
                                <Search className="mr-2 h-4 w-4 text-blue-500" />
                                <div className="flex flex-col">
                                    <span className="font-bold">{r.client_name}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase">{r.service_id} • {r.status}</span>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                <CommandGroup heading="Navegação">
                    <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                        <CommandShortcut>⌘D</CommandShortcut>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/smp"))}>
                        <Layers className="mr-2 h-4 w-4" />
                        <span>SMP</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/multicadastro"))}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>Multicadastro</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/rcv"))}>
                        <FileCheck className="mr-2 h-4 w-4" />
                        <span>RC-V</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/tecnologia-logistica"))}>
                        <Truck className="mr-2 h-4 w-4" />
                        <span>Tecnologia Logística</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/tecnologia-risco"))}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Tecnologia Risco</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/auditoria"))}>
                        <History className="mr-2 h-4 w-4" />
                        <span>Auditoria</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Configurações">
                    <CommandItem onSelect={() => runCommand(() => setTheme(theme === "dark" ? "light" : "dark"))}>
                        {theme === "dark" ? (
                            <Sun className="mr-2 h-4 w-4" />
                        ) : (
                            <Moon className="mr-2 h-4 w-4" />
                        )}
                        <span>Alternar Tema</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => signOut())}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sair do Sistema</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
