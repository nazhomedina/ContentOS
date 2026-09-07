"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Layers, Lightbulb, ListChecks, Gauge, LogOut, Sun, CalendarRange, Workflow, Filter } from "lucide-react";
import { MARCA } from "@/lib/dominio/marca";
import type { Rol } from "@/lib/dominio/roles";
import { cn } from "@/lib/utils";

type Entrada = { href: string; etiqueta: string; icono: React.ComponentType<{ className?: string }>; roles: Rol[] };

type EntradaNav = Entrada & { movil?: boolean };
const ENTRADAS: EntradaNav[] = [
  { href: "/hoy", etiqueta: "Hoy", icono: Sun, roles: ["owner"], movil: true },
  { href: "/semana", etiqueta: "Semana", icono: CalendarRange, roles: ["owner", "viewer"], movil: true },
  { href: "/maquina", etiqueta: "Máquina", icono: Workflow, roles: ["owner", "viewer"] },
  { href: "/embudo", etiqueta: "Embudo", icono: Filter, roles: ["owner", "viewer"] },
  { href: "/cola", etiqueta: "Cola", icono: ListChecks, roles: ["owner", "editor"], movil: true },
  { href: "/piezas", etiqueta: "Piezas", icono: Layers, roles: ["owner", "editor", "viewer"], movil: true },
  { href: "/historias", etiqueta: "Historias", icono: CalendarDays, roles: ["owner", "editor", "viewer"], movil: true },
  { href: "/ideas", etiqueta: "Ideas", icono: Lightbulb, roles: ["owner"] },
  { href: "/tablero", etiqueta: "Latidos", icono: Gauge, roles: ["owner", "viewer"] },
];

export function Navegacion({ rol, nombre }: { rol: Rol; nombre: string }) {
  const pathname = usePathname();
  const entradas = ENTRADAS.filter((e) => e.roles.includes(rol));

  return (
    <>
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-extrabold tracking-tight">
            {MARCA.nombre}
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {entradas.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium",
                  pathname.startsWith(e.href) ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {e.etiqueta}
              </Link>
            ))}
          </nav>
          <form action="/auth/salir" method="post" className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">{nombre}</span>
            <button type="submit" className="rounded-md p-1.5 text-muted-foreground hover:text-foreground" aria-label="Salir" title="Salir">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Barra inferior: móvil primero para Mariela */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur md:hidden">
        <ul className="mx-auto flex max-w-3xl justify-around">
          {entradas.filter((e) => e.movil || rol !== "owner").slice(0, 5).map((e) => {
            const activo = pathname.startsWith(e.href);
            return (
              <li key={e.href} className="flex-1">
                <Link
                  href={e.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                    activo ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <e.icono className="size-5" />
                  {e.etiqueta}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
