"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { CASHIER_REVIEW_PROFILE, DEMO_ROLE_KEY, REVIEW_PROFILE, type ErpProfile } from "@/lib/erp";

export function useErpSession(options?: { adminOnly?: boolean }) {
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<ErpProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.email) {
          const { data, error } = await supabase
            .from("AppUser")
            .select("id, name, email, role, active")
            .eq("email", user.email.toLowerCase())
            .maybeSingle();

          if (!error && data?.active) {
            if (options?.adminOnly && data.role !== "Administrador") {
              if (!cancelled) {
                setProfile({
                  id: data.id,
                  name: data.name ?? "",
                  email: (data.email ?? user.email).toLowerCase(),
                  role: data.role ?? "Cajero",
                  active: Boolean(data.active),
                });
                setChecking(false);
              }
              return;
            }

            if (!cancelled) {
              setProfile({
                id: data.id,
                name: data.name ?? "",
                email: (data.email ?? user.email).toLowerCase(),
                role: data.role ?? "Cajero",
                active: Boolean(data.active),
              });
              setChecking(false);
            }
            return;
          }
        }
      } catch {
        // Sin variables de entorno o sin sesión: modo revisión por URL.
      }

      if (!cancelled) {
        const demoRole =
          typeof window !== "undefined"
            ? window.localStorage.getItem(DEMO_ROLE_KEY)
            : null;
        setProfile(
          demoRole === "Cajero" ? CASHIER_REVIEW_PROFILE : REVIEW_PROFILE
        );
        setChecking(false);
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [options?.adminOnly]);

  return { checking, profile };
}
