import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      // garante que a sessão vindo do link seja processada
      await supabase.auth.getSession();
      nav("/dashboard", { replace: true });
    })();
  }, [nav]);

  return (
    <div className="p-6">
      <p>Confirmando acesso...</p>
    </div>
  );
}