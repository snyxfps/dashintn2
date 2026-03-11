import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LoginPage } from "@/components/LoginPage";
import { AppLayout } from "@/components/AppLayout";
import DashboardGeral from "@/pages/DashboardGeral";
import AuditoriaPage from "@/pages/Auditoria";
import { ServicePage } from "@/pages/ServicePage";
import NotFound from "./pages/NotFound";
import { CommandMenu } from "@/components/CommandMenu";

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<DashboardGeral />} />
        <Route path="smp" element={<ServicePage serviceName="SMP" />} />
        <Route path="multicadastro" element={<ServicePage serviceName="Multicadastro" />} />
        <Route path="rcv" element={<ServicePage serviceName="RC-V" />} />
        <Route path="tecnologia-logistica" element={<ServicePage serviceName="Tecnologia Logística" />} />
        <Route path="tecnologia-risco" element={<ServicePage serviceName="Tecnologia Risco" />} />
        <Route path="auditoria" element={<AuditoriaPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <CommandMenu />
          <ProtectedRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
