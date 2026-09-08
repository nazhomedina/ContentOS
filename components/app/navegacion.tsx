"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarDays, Layers, ListChecks, LogOut, Sun, Workflow, Shapes, Menu, X, Users } from "lucide-react";
import { MARCA } from "@/lib/dominio/marca";
import type { Rol } from "@/lib/dominio/roles";
import { cn } from "@/lib/utils";

type Entrada = { href: string; etiqueta: string; icono: React.ComponentType<{ className?: string }>; roles: Rol[] };

const ENTRADAS: Entrada[] = [
  { href: "/inicio", etiqueta: "Inicio", icono: Sun, roles: ["owner"] },
  { href: "/piezas", etiqueta: "Piezas", icono: Layers, roles: ["owner", "editor", "viewer"] },
  { href: "/formatos", etiqueta: "Formatos", icono: Shapes, roles: ["owner", "editor"] },
  { href: "/sistemas", etiqueta: "Sistemas", icono: Workflow, roles: ["owner"] },
  { href: "/cola", etiqueta: "Cola", icono: ListChecks, roles: ["owner", "editor"] },
  { href: "/equipo", etiqueta: "Equipo", icono: Users, roles: ["owner"] },
  { href: "/historias", etiqueta: "Historias", icono: CalendarDays, roles: ["owner", "editor", "viewer"] },
];

/** Menú lateral fijo en escritorio; en móvil, barra superior con el mismo menú plegable. */
export function Navegacion({ rol, nombre }: { rol: Rol; nombre: string }) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const entradas = ENTRADAS.filter((e) => e.roles.includes(rol));

  const lista = (
    <ul className="space-y-0.5">
      {entradas.map((e) => {
        const activo = pathname === e.href || pathname.startsWith(e.href + "/");
        return (
          <li key={e.href}>
            <Link
              href={e.href}
              onClick={() => setAbierto(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition",
                activo ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <e.icono className="size-4" />
              {e.etiqueta}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const pie = (
    <form action="/auth/salir" method="post" className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground">
      <span className="truncate">{nombre}</span>
      <button type="submit" className="rounded-md p-1.5 hover:bg-muted hover:text-foreground" aria-label="Salir" title="Salir">
        <LogOut className="size-4" />
      </button>
    </form>
  );

  return (
    <>
      {/* Escritorio */}
      <aside className="hidden w-56 shrink-0 border-r bg-background md:flex md:flex-col">
        <div className="px-5 py-5">
          <Link href="/" className="text-lg font-extrabold tracking-tight">{MARCA.nombre}</Link>
        </div>
        <nav className="flex-1 px-2">{lista}</nav>
        <div className="border-t">{pie}</div>
      </aside>

      {/* Móvil */}
      <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b bg-background px-4 md:hidden">
        <Link href="/" className="font-extrabold tracking-tight">{MARCA.nombre}</Link>
        <button type="button" onClick={() => setAbierto((v) => !v)} className="rounded-md p-1.5" aria-label="Menú">
          {abierto ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>
      {abierto && (
        <div className="fixed inset-0 top-12 z-10 bg-background md:hidden">
          <nav className="p-2">{lista}</nav>
          <div className="border-t">{pie}</div>
        </div>
      )}
    </>
  );
}
