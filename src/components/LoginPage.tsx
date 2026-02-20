import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Layers, Eye, EyeOff, LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) toast.error(error.message === 'Invalid login credentials' ? 'E-mail ou senha inválidos' : error.message);
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) toast.error(error.message);
        else toast.success('Conta criada com sucesso! Faça login.');
        setMode('login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, hsl(222 75% 14%) 0%, hsl(222 75% 22%) 100%)' }}>
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(213 90% 55% / 0.2)', border: '1px solid hsl(213 90% 55% / 0.4)' }}>
            <Layers className="w-5 h-5" style={{ color: 'hsl(213 90% 65%)' }} />
          </div>
          <span className="text-xl font-bold tracking-tight">Central de Integrações</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4" style={{ letterSpacing: '-0.03em' }}>
            Gestão operacional<br />
            <span style={{ color: 'hsl(213 90% 65%)' }}>centralizada e eficiente</span>
          </h1>
          <p className="text-base opacity-70 leading-relaxed max-w-sm">
            Acompanhe integrações SMP, Multicadastro, RC-V e Tecnologia Logística em tempo real, com visibilidade total dos clientes e status.
          </p>
        </div>

        <div className="flex gap-8">
          {[
            { label: 'Serviços', value: '4' },
            { label: 'Clientes ativos', value: '20+' },
            { label: 'Status em tempo real', value: '6' },
          ].map(item => (
            <div key={item.label}>
              <div className="text-3xl font-bold" style={{ color: 'hsl(213 90% 65%)' }}>{item.value}</div>
              <div className="text-xs opacity-60 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-2 mb-6">
              <Layers className="w-5 h-5" style={{ color: 'hsl(222 75% 28%)' }} />
              <span className="font-bold text-sm" style={{ color: 'hsl(222 75% 28%)' }}>Central de Integrações</span>
            </div>

            <h2 className="text-2xl font-bold mb-1" style={{ color: 'hsl(220 30% 12%)', letterSpacing: '-0.02em' }}>
              {mode === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
            </h2>
            <p className="text-sm mb-6" style={{ color: 'hsl(220 15% 50%)' }}>
              {mode === 'login' ? 'Faça login para acessar o painel' : 'Preencha os dados para criar sua conta'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-sm font-medium">Nome completo</Label>
                  <Input
                    id="fullName"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 font-semibold"
                disabled={loading}
                style={{ background: 'hsl(222 75% 28%)', color: 'white' }}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {mode === 'login' ? 'Entrando...' : 'Criando conta...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    {mode === 'login' ? 'Entrar' : 'Criar conta'}
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-5 text-center text-sm" style={{ color: 'hsl(220 15% 50%)' }}>
              {mode === 'login' ? (
                <>Não tem conta?{' '}
                  <button onClick={() => setMode('signup')} className="font-semibold hover:underline" style={{ color: 'hsl(222 75% 28%)' }}>
                    Criar agora
                  </button>
                </>
              ) : (
                <>Já tem conta?{' '}
                  <button onClick={() => setMode('login')} className="font-semibold hover:underline" style={{ color: 'hsl(222 75% 28%)' }}>
                    Fazer login
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
