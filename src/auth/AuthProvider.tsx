import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    signIn: async (email, password) => {
      if (!email.toLowerCase().endsWith('@apisul.com.br')) {
        throw new Error('Acesso restrito: apenas e-mails corporativos (@apisul.com.br) são permitidos.');
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signOut: async () => {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Erro ao fazer logout:", err);
      } finally {
        setSession(null);
      }
    },
  }), [session, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}