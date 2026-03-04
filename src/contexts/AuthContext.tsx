import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: 'admin' | 'viewer' | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'viewer' | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string, fallbackUser?: User | null) => {
    try {
      console.log("AuthContext: Buscando role para", userId);

      // Timeout de 3 segundos para a query não travar o app
      const rolePromise = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout na busca de role")), 3000)
      );

      const { data, error }: any = await Promise.race([rolePromise, timeoutPromise]);

      if (!error && data?.role) {
        console.log("AuthContext: Role encontrada:", data.role);
        setUserRole(data.role);
        return;
      }
    } catch (err) {
      console.warn("AuthContext: Erro ou timeout ao buscar role, usando fallback.");
    }

    // 2) Fallback: role em app_metadata/user_metadata
    const metaRole = (fallbackUser?.app_metadata as any)?.role || (fallbackUser?.user_metadata as any)?.role;
    if (metaRole === 'admin' || metaRole === 'viewer') {
      setUserRole(metaRole);
      return;
    }

    // 3) Default seguro
    setUserRole('viewer');
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("AuthContext: Erro ao recuperar sessão:", error.message);
          // Se o token de refresh for inválido ou não encontrado, limpamos tudo
          if (error.message.includes("refresh_token_not_found") || error.message.includes("Invalid Refresh Token")) {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setUserRole(null);
            return;
          }
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchRole(session.user.id, session.user);
        } else {
          setUserRole(null);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      try {
        if (session?.user) {
          await fetchRole(session.user.id, session.user);
        } else {
          setUserRole(null);
        }
      } catch (err) {
        console.error("Auth change error:", err);
      } finally {
        setLoading(false);
      }
    });

    const timer = setTimeout(() => setLoading(false), 6000);

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user, session, userRole, isAdmin: userRole === 'admin',
      loading, signIn, signUp, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
