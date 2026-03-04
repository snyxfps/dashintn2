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
      <div className="min-h-screen flex items-center justify-center bg-[#0a192f] overflow-hidden relative">
        {/* Animated background elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/10 rounded-full blur-[60px] animate-bounce" style={{ animationDuration: '4s' }} />

        <div className="relative z-10 flex flex-col items-center gap-6 anim-zoom-in">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-primary/40 rounded-lg animate-pulse" />
            </div>
          </div>

          <div className="flex flex-col items-center">
            <h2 className="text-xl font-bold text-white tracking-widest uppercase">Central de Integrações</h2>
            <div className="mt-2 flex items-center gap-1">
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce" />
            </div>
          </div>
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
