import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Layers, Eye, EyeOff, LogIn, Sparkles, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const [verificationSent, setVerificationSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.toLowerCase().endsWith('@apisul.com.br')) {
      toast.error('Acesso restrito: utilize seu e-mail corporativo (@apisul.com.br).');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) toast.error(error.message === 'Invalid login credentials' ? 'E-mail ou senha inválidos' : error.message);
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Cadastro realizado! Verifique seu e-mail.');
          setVerificationSent(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#020617]">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />

      {/* Container */}
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-0 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative z-10 bg-slate-900/40 backdrop-blur-xl anim-zoom-in">

        {/* Left Panel: Info & Branding */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border-r border-white/5 relative overflow-hidden">
          {/* Subtle grain overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

          <div className="relative z-10 flex items-center gap-3 anim-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-white tracking-tighter uppercase italic leading-none">
              Central<span className="text-blue-400 block text-sm -mt-1">de Integrações</span>
            </span>
          </div>

          <div className="relative z-10 anim-fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
              <Sparkles className="w-3 h-3" />
              SISTEMA INTELIGENTE
            </div>
            <h1 className="text-5xl font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
              Domine seus dados<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">em tempo real.</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-md font-medium">
              Gestão centralizada de integrações e monitoramento inteligente com visibilidade 360º de seus clientes.
            </p>
          </div>
        </div>

        {/* Right Panel: Form */}
        <div className="p-8 lg:p-16 flex flex-col justify-center bg-[#020617]/40 relative">
          <div className="max-w-md mx-auto w-full">
            {/* Mobile Header */}
            <div className="lg:hidden flex flex-col items-center mb-8 gap-4 anim-fade-up">
              <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Layers className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic text-center leading-none">
                Central<span className="text-blue-400">de Integrações</span>
              </h1>
            </div>

            {verificationSent ? (
              <div className="anim-fade-up space-y-6 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <ShieldCheck className="w-8 h-8 text-blue-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-white tracking-tight">Verifique seu e-mail</h2>
                  <p className="text-slate-400 font-medium leading-relaxed">
                    Acabamos de enviar um e-mail para <span className="text-white font-bold">{email}</span> com um link para confirmar sua conta.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-slate-400 italic">
                  Após confirmar seu e-mail, você poderá acessar todos os recursos da Central de Integrações.
                </div>
                <Button
                  onClick={() => {
                    setVerificationSent(false);
                    setMode('login');
                  }}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl"
                >
                  Voltar para o Login
                </Button>
              </div>
            ) : (
              <>
                <div className="anim-fade-up" style={{ animationDelay: '0.1s' }}>
                  <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                    {mode === 'login' ? 'Acessar painel' : 'Criar nova conta'}
                  </h2>
                  <p className="text-slate-400 mb-8 font-medium">
                    {mode === 'login'
                      ? 'Bem-vindo de volta! Insira suas credenciais abaixo.'
                      : 'Seja parte da nossa central. Preencha os campos.'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 anim-fade-up" style={{ animationDelay: '0.2s' }}>
                  {mode === 'signup' && (
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-sm font-semibold text-slate-300">Nome Completo</Label>
                      <Input
                        id="fullName"
                        placeholder="Ex: João da Silva"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        required
                        className="h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:ring-blue-500 focus:border-blue-500 rounded-xl"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-slate-300">E-mail Corporativo</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="nome@empresa.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:ring-blue-500 focus:border-blue-500 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-semibold text-slate-300">Senha</Label>
                      {mode === 'login' && (
                        <button type="button" className="text-xs text-blue-400 hover:underline font-bold">Esqueceu a senha?</button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPass ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        className="h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:ring-blue-500 focus:border-blue-500 rounded-xl pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                      >
                        {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 font-bold text-lg rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Processando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <LogIn className="w-5 h-5" />
                        <span>{mode === 'login' ? 'Entrar Agora' : 'Finalizar Cadastro'}</span>
                      </div>
                    )}
                  </Button>
                </form>

                <div className="mt-8 pt-8 border-t border-white/5 text-center anim-fade-up" style={{ animationDelay: '0.3s' }}>
                  <div className="flex flex-col gap-4">
                    <p className="text-sm font-medium text-slate-500">
                      {mode === 'login' ? 'Ainda não possui acesso?' : 'Já possui uma conta ativa?'}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                      className="w-full h-12 bg-transparent border-white/10 text-white hover:bg-white/5 rounded-xl font-bold"
                    >
                      {mode === 'login' ? 'Criar Conta' : 'Voltar para o Login'}
                    </Button>
                  </div>

                  <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">
                    <ShieldCheck className="w-3 h-3 text-blue-500" />
                    ACESSO SEGURO E CRIPTOGRAFADO
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
