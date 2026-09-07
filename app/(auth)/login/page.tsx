import { MARCA } from "@/lib/dominio/marca";
import { FormularioLogin } from "./formulario";

export const metadata = { title: "Entrar" };

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ volver?: string; error?: string }>;
}) {
  const { volver = "/", error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">{MARCA.nombre}</h1>
        <p className="text-muted-foreground">Entra con tu correo. Sin contraseña: te mandamos un enlace.</p>
      </div>
      {error === "sin-perfil" && (
        <p className="rounded-md border border-rojo/40 bg-rojo/5 px-3 py-2 text-sm text-rojo">
          Tu correo entró pero no tiene perfil. Pídele a Nazho que te dé de alta.
        </p>
      )}
      {error === "enlace" && (
        <p className="rounded-md border border-rojo/40 bg-rojo/5 px-3 py-2 text-sm text-rojo">
          El enlace caducó o ya se usó. Pide otro.
        </p>
      )}
      <FormularioLogin volver={volver} />
    </main>
  );
}
