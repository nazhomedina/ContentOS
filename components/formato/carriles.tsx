import Link from "next/link";
import { NOMBRE_ESTADO, type EstadoPieza } from "@/lib/dominio/estados";
import { bucketVencimiento } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

export type PiezaCarril = {
  id: string; id_publico: string | null; titulo: string | null; estado: string; series: string[];
  hipotesis_id: string | null; etiquetas: string[];
  tarea?: { estado: string; vence: string | null } | null;
  raw?: boolean;
};

type Fila = { id: string; href: string; titulo: string; sub?: string; señal?: "rojo" | "ambar" | "azul"; nota?: string };
type Grupo = { nombre: string; total: number; filas: Fila[]; verMas?: { n: number; href: string } };

const MAX_GRUPO = 5;
const UMBRAL_SERIE = 8;

/**
 * Los carriles de producción: un carril por etapa, el conteo y solo el título por fila.
 * Una señal de color únicamente cuando algo pide atención. Los frentes A–E se cuentan bajo su
 * pieza madre; una serie con muchas piezas en el mismo carril se agrupa y muestra las siguientes.
 */
export function Carriles({ columnas, piezas, ruta }: { columnas: EstadoPieza[]; piezas: PiezaCarril[]; ruta: string }) {
  return (
    <div className={cn("grid gap-3 md:grid-cols-2", columnas.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
      {columnas.map((e) => {
        const enColumna = piezas.filter((p) => (e === "listo" ? ["listo", "programada"].includes(p.estado) : p.estado === e));
        const { sueltas, grupos, totalPiezas, totalFrentes } = organizar(enColumna, ruta, e);
        return (
          <section key={e} className="min-w-0 rounded-xl border bg-muted/20 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 px-2 pb-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{e === "listo" ? "Listo" : NOMBRE_ESTADO[e]}</h2>
              <span className="text-xs text-muted-foreground">{totalFrentes > totalPiezas ? `${totalPiezas} piezas · ${totalFrentes} frentes` : totalPiezas}</span>
            </div>
            {enColumna.length === 0 && <p className="px-2 py-2.5 text-xs text-muted-foreground">Nada en {NOMBRE_ESTADO[e].toLowerCase()}.</p>}
            <Lista filas={sueltas} />
            {grupos.map((g) => (
              <div key={g.nombre}>
                <div className="mt-1 flex items-baseline justify-between border-t px-2 pb-0.5 pt-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{g.nombre}</span>
                  <span className="text-[11px] text-muted-foreground">{g.total}</span>
                </div>
                <Lista filas={g.filas} />
                {g.verMas && <Link href={g.verMas.href} className="block px-2 py-1.5 text-xs text-primary hover:underline">y {g.verMas.n} más</Link>}
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function Lista({ filas }: { filas: Fila[] }) {
  if (filas.length === 0) return null;
  return (
    <ul className="flex flex-col">
      {filas.map((f) => (
        <li key={f.id}>
          <Link href={f.href} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[13px] leading-snug hover:bg-background" title={f.nota ?? f.titulo}>
            <span className="min-w-0 truncate">{f.titulo}{f.sub && <span className="text-[11px] text-muted-foreground"> · {f.sub}</span>}</span>
            {f.señal && <span aria-label={f.nota} className={cn("size-[7px] shrink-0 rounded-full", f.señal === "rojo" ? "bg-rojo" : f.señal === "ambar" ? "bg-ambar" : "bg-primary")} />}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Qué pide atención en una pieza: bloqueo o vencimiento en rojo/ámbar, sin hipótesis en rojo, en curso o con RAW en azul. */
function señalDe(p: PiezaCarril): { señal?: Fila["señal"]; nota?: string } {
  if (p.tarea?.estado === "bloqueada") return { señal: "rojo", nota: "Tarea bloqueada" };
  if (p.tarea?.vence && p.tarea.estado !== "hecha") {
    const b = bucketVencimiento(p.tarea.vence);
    if (b === "vencida") return { señal: "rojo", nota: "Tarea vencida" };
    if (b === "hoy" || b === "semana") return { señal: "ambar", nota: "Vence esta semana" };
  }
  if (!p.hipotesis_id && !p.etiquetas.includes("legado")) return { señal: "rojo", nota: "Sin hipótesis" };
  if (!p.hipotesis_id) return { señal: "rojo", nota: "Sin hipótesis (heredada de Notion)" };
  if (p.tarea?.estado === "en_curso") return { señal: "azul", nota: "En curso" };
  if (p.raw) return { señal: "azul", nota: "RAW listo para editar" };
  return {};
}

/** Frentes A–E bajo su pieza madre; series grandes agrupadas con las primeras N por ID. */
function organizar(piezas: PiezaCarril[], ruta: string, estado: EstadoPieza) {
  const madre = (p: PiezaCarril) => /^(.+)-[A-E]$/.exec(p.id_publico ?? "")?.[1] ?? null;
  const porMadre = new Map<string, PiezaCarril[]>();
  const simples: PiezaCarril[] = [];
  for (const p of piezas) {
    const m = madre(p);
    if (m) (porMadre.get(m) ?? porMadre.set(m, []).get(m)!).push(p);
    else simples.push(p);
  }
  // Una pieza madre agrupa solo si tiene más de un frente; un frente suelto se trata como pieza.
  const unidades: { p: PiezaCarril; frentes: number; titulo: string; href: string }[] = [];
  for (const p of simples) unidades.push({ p, frentes: 1, titulo: p.titulo ?? p.id_publico ?? "(sin título)", href: `/piezas/${p.id}` });
  for (const [m, fs] of porMadre) {
    if (fs.length === 1) { unidades.push({ p: fs[0], frentes: 1, titulo: fs[0].titulo ?? m, href: `/piezas/${fs[0].id}` }); continue; }
    const t = (fs[0].titulo ?? m).replace(/\s*[·—-]\s*Frente\s+[A-E].*$/i, "").trim() || m;
    const rep = fs.find((f) => señalDe(f).señal === "rojo") ?? fs.find((f) => señalDe(f).señal) ?? fs[0];
    unidades.push({ p: rep, frentes: fs.length, titulo: t, href: `${ruta}?vista=lista&estado=${estado}&q=${encodeURIComponent(m)}` });
  }
  unidades.sort((a, b) => (a.p.id_publico ?? "").localeCompare(b.p.id_publico ?? "", "es", { numeric: true }));

  const porSerie = new Map<string, typeof unidades>();
  for (const u of unidades) for (const s of u.p.series ?? []) (porSerie.get(s) ?? porSerie.set(s, []).get(s)!).push(u);
  const seriesGrandes = [...porSerie.entries()].filter(([, us]) => us.length >= UMBRAL_SERIE).map(([s]) => s);
  const enGrupo = new Set<string>();
  const grupos: Grupo[] = seriesGrandes.map((s) => {
    const us = porSerie.get(s)!.filter((u) => !enGrupo.has(u.p.id));
    us.forEach((u) => enGrupo.add(u.p.id));
    return {
      nombre: s, total: us.length,
      filas: us.slice(0, MAX_GRUPO).map((u) => fila(u)),
      verMas: us.length > MAX_GRUPO ? { n: us.length - MAX_GRUPO, href: `${ruta}?vista=lista&estado=${estado}&serie=${encodeURIComponent(s)}` } : undefined,
    };
  });
  const sueltas = unidades.filter((u) => !enGrupo.has(u.p.id)).map((u) => fila(u));
  return { sueltas, grupos, totalPiezas: unidades.length, totalFrentes: piezas.length };

  function fila(u: (typeof unidades)[number]): Fila {
    const { señal, nota } = señalDe(u.p);
    return { id: u.p.id, href: u.href, titulo: u.titulo, sub: u.frentes > 1 ? `${u.frentes} frentes` : undefined, señal, nota };
  }
}
