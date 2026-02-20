import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type Role = 'admin' | 'viewer';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: Role | null;
  isAdmin: boolean;
  loading: boolean;

  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: Error | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      // Se não achar ou falhar, não derruba a UI: assume viewer
      if (error) {
        setUserRole('viewer');
        return;
      }

      const role = (data?.role as Role | undefined) ?? 'viewer';
      setUserRole(role);
    } catch {
      setUserRole('viewer');
    }
  };

  const refreshRole = async () => {
    if (!session?.user?.id) return;
    await fetchRole(session.user.id);
  };

  useEffect(() => {
    let alive = true;

    // 1) carrega sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) fetchRole(session.user.id);
      else setUserRole(null);

      setLoading(false);
    });

    // 2) escuta mudanças de auth
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) fetchRole(newSession.user.id);
      else setUserRole(null);

      setLoading(false);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error as unknown as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName?.trim() || null },
        // IMPORTANTÍSSIMO para confirmação por e-mail redirecionar certo
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    // No Supabase: quando confirmação de e-mail está ON,
    // o usuário é criado mas a sessão não vem ativa.
    const needsEmailConfirmation = !data?.session;

    return { error: error as unknown as Error | null, needsEmailConfirmation };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = useMemo<AuthContextType>(() => {
    const role: Role | null = userRole;
    return {
      user,
      session,
      userRole: role,
      isAdmin: role === 'admin',
      loading,
      signIn,
      signUp,
      signOut,
      refreshRole,
    };
  }, [user, session, userRole, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};