import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/supabase/server";
import { Navegacion } from "@/components/app/navegacion";
import { Toaster } from "@/components/ui/sonner";
import type { Rol } from "@/lib/dominio/roles";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  return (
    <div className="flex min-h-dvh flex-col">
      <Navegacion rol={sesion.perfil.rol as Rol} nombre={sesion.perfil.nombre} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-4 md:pb-8">{children}</main>
      <Toaster position="top-center" richColors />
    </div>
  );
}
