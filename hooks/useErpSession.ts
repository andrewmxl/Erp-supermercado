"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  canManageUsers,
  DEMO_ROLE_KEY,
  normalizeRole,
  profileForDemoRole,
  type ErpProfile,
} from "@/lib/erp";

export function useErpSession(options?: { adminOnly?: boolean }) {
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<ErpProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const demoRole =
        typeof window !== "undefined"
          ? window.localStorage.getItem(DEMO_ROLE_KEY)
          : null;

      if (demoRole) {
        if (!cancelled) {
          setProfile(profileForDemoRole(demoRole));
          setChecking(false);
        }
        return;
      }

      try {
        const supabase = createClient();
        const userWait = supabase.auth.getUser();
        const userTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("sesión lenta")), 8000);
        });
        const {
          data: { user },
        } = await Promise.race([userWait, userTimeout]);

        if (user?.email) {
          const { data, error } = await supabase
            .from("AppUser")
            .select("id, name, email, role, active")
            .eq("email", user.email.toLowerCase())
            .maybeSingle();

          if (!error && data?.active) {
            if (options?.adminOnly && !canManageUsers(data.role)) {
              if (!cancelled) {
                setProfile({
                  id: data.id,
                  name: data.name ?? "",
                  email: (data.email ?? user.email).toLowerCase(),
                  role: normalizeRole(data.role ?? "Cajero"),
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
                role: normalizeRole(data.role ?? "Cajero"),
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
        setProfile(profileForDemoRole(demoRole));
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
