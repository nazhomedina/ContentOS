import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Database, Perfil } from "./tipos";

/** Cliente con la sesión del usuario (RLS aplica). Para Server Components y Server Actions. */
export async function crearClienteServidor() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (lista) => {
          try {
            lista.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component: el middleware refresca la sesión.
          }
        },
      },
    },
  );
}

export type Sesion = { userId: string; perfil: Perfil };

/** Usuario y perfil de la request. Cacheado por request. Null si no hay sesión o no hay perfil. */
export const sesionActual = cache(async (): Promise<Sesion | null> => {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("user_id", user.id).maybeSingle();
  if (!perfil) return null;
  return { userId: user.id, perfil };
});
