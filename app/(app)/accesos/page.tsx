import { redirect } from "next/navigation";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { ListaAccesos, type Acceso } from "@/components/accesos/lista-accesos";

export const metadata = { title: "Accesos" };
export const dynamic = "force-dynamic";

/**
 * Quién puede entrar y con qué código. Sin correos de por medio: Nazho genera el código aquí y lo pasa en
 * persona; es la contraseña de Supabase Auth. El enlace por correo queda como respaldo en el login.
 */
export default async function Accesos() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  if (sesion.perfil.rol !== "owner") redirect("/");
  const supabase = await crearClienteServidor();
  const { data: permitidos } = await supabase.from("perfiles_permitidos").select("email, nombre, rol").order("rol").order("nombre");

  // Último acceso: lo sabe Auth, no la tabla de perfiles. Solo el owner llega aquí.
  const admin = crearClienteAdmin();
  const { data: usuarios } = await admin.auth.admin.listUsers({ perPage: 200 });
  const porEmail = new Map((usuarios?.users ?? []).map((u) => [u.email?.toLowerCase() ?? "", u.last_sign_in_at ?? null]));
  const accesos: Acceso[] = (permitidos ?? []).map((p) => ({ ...p, tiene_usuario: porEmail.has(p.email.toLowerCase()), ultimo_acceso: porEmail.get(p.email.toLowerCase()) ?? null }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Accesos</h1>
        <p className="text-sm text-muted-foreground">
          Cada persona entra con su correo y un código que generas aquí y le pasas en persona. Sin correos ni enlaces. Un código nuevo reemplaza al anterior.
        </p>
      </header>
      <ListaAccesos accesos={accesos} yo={sesion.perfil.email ?? ""} />
    </div>
  );
}
