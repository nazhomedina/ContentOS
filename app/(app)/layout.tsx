import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/supabase/server";
import { Navegacion } from "@/components/app/navegacion";
import { Toaster } from "@/components/ui/sonner";
import type { Rol } from "@/lib/dominio/roles";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Navegacion rol={sesion.perfil.rol as Rol} nombre={sesion.perfil.nombre} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
      <Toaster position="top-center" />
    </div>
  );
}
