import { notFound, redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { IdPublico, InsigniaEstado, InsigniaFormato, InsigniaTarea } from "@/components/app/insignias";
import { Markdown } from "@/components/markdown";
import { AccionesPieza } from "@/components/pieza/acciones-pieza";
import { AccionesOwner } from "@/components/pieza/acciones-owner";
import { Assets } from "@/components/pieza/assets";
import { Checklist } from "@/components/pieza/checklist";
import { Comentarios } from "@/components/pieza/comentarios";
import { hipotesisEnUnaLinea } from "@/lib/dominio/hipotesis";
import { checklistPorDefecto } from "@/lib/dominio/estados";
import { fechaCorta, fechaHora } from "@/lib/dominio/tiempo";
import type { Rol } from "@/lib/dominio/roles";

export const dynamic = "force-dynamic";

export default async function DetallePieza({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  const supabase = await crearClienteServidor();

  const { data: pieza } = await supabase
    .from("piezas")
    .select("*, format_card:format_cards(codigo, nombre), responsable:perfiles!piezas_responsable_id_fkey(nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!pieza) notFound();

  const [{ data: tareas }, { data: comentarios }, { data: archivos }, { data: perfiles }] = await Promise.all([
    supabase.from("tareas").select("id, tipo, estado, vence, checklist, nota_bloqueo, asignado:perfiles!tareas_asignado_a_fkey(nombre)").eq("pieza_id", id).order("created_at"),
    supabase.from("comentarios").select("id, texto, created_at, autor:perfiles!comentarios_autor_fkey(nombre)").eq("pieza_id", id).order("created_at"),
    supabase.storage.from("assets").list(`piezas/${id}`, { limit: 100, sortBy: { column: "created_at", order: "desc" } }),
    supabase.from("perfiles").select("user_id, nombre, rol").in("rol", ["owner", "editor"]).order("nombre"),
  ]);

  // Storage.list no es recursivo: listamos las tres carpetas convencionales.
  const carpetas = ["raw", "portada", "final"];
  const listados = await Promise.all(carpetas.map((c) => supabase.storage.from("assets").list(`piezas/${id}/${c}`, { limit: 100 })));
  const assets = [
    ...(archivos ?? []).filter((a) => a.id).map((a) => ({ ruta: `piezas/${id}/${a.name}`, nombre: a.name, carpeta: "" })),
    ...listados.flatMap((l, i) => (l.data ?? []).filter((a) => a.id).map((a) => ({ ruta: `piezas/${id}/${carpetas[i]}/${a.name}`, nombre: a.name, carpeta: carpetas[i] }))),
  ];

  const rol = sesion.perfil.rol as Rol;

  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <IdPublico id={pieza.id_publico} />
          <InsigniaFormato formato={pieza.formato} />
          <InsigniaEstado estado={pieza.estado} />
          {pieza.format_card && <span className="text-xs text-muted-foreground">{pieza.format_card.codigo} · {pieza.format_card.nombre}</span>}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">{pieza.titulo ?? pieza.id_publico}</h1>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <Dato k="Serie" v={pieza.serie ?? "—"} />
          <Dato k="Fecha objetivo" v={fechaCorta(pieza.fecha_objetivo)} />
          <Dato k="Responsable" v={pieza.responsable?.nombre ?? "—"} />
          <Dato k="Etapa" v={pieza.etapa_embudo} />
        </dl>
        <p className={pieza.requiere_hipotesis ? "rounded-md border border-rojo/40 bg-rojo/5 px-3 py-2 text-sm text-rojo" : "text-sm text-muted-foreground"}>
          <span className="font-semibold">Hipótesis:</span> {hipotesisEnUnaLinea(pieza.hipotesis)}
          {pieza.requiere_hipotesis && " · falta que Nazho la complete"}
        </p>
        {pieza.estado === "publicada" && pieza.url && (
          <p className="text-sm">
            Publicada {fechaHora(pieza.publicada_en)} en {pieza.plataforma} · <a href={pieza.url} target="_blank" rel="noreferrer" className="text-primary underline">ver</a>
          </p>
        )}
      </header>

      {rol === "owner" && (
        <AccionesOwner piezaId={pieza.id} estado={pieza.estado} formato={pieza.formato} fechaObjetivo={pieza.fecha_objetivo} responsableId={pieza.responsable_id} perfiles={perfiles ?? []} />
      )}

      <Seccion titulo="Guion"><Markdown texto={pieza.guion} /></Seccion>
      <Seccion titulo="Spec visual"><Markdown texto={pieza.spec_visual} /></Seccion>
      {pieza.cta && <Seccion titulo="CTA"><p className="text-sm">{pieza.cta}</p></Seccion>}

      <Seccion titulo="Assets">
        <Assets piezaId={pieza.id} assets={assets} puedeSubir={rol !== "viewer"} />
      </Seccion>

      <Seccion titulo="Checklist">
        {(tareas ?? []).length === 0 && <p className="text-sm text-muted-foreground">Sin tareas asignadas.</p>}
        <div className="space-y-4">
          {(tareas ?? []).map((t) => (
            <div key={t.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <InsigniaTarea tipo={t.tipo} />
                <span className="text-muted-foreground">vence {fechaCorta(t.vence)} · {t.asignado?.nombre ?? "sin asignar"} · {t.estado}</span>
                {t.estado === "bloqueada" && <span className="text-rojo">{t.nota_bloqueo}</span>}
              </div>
              <Checklist
                tareaId={t.id}
                inicial={normalizarChecklist(t.checklist, checklistPorDefecto(t.tipo, pieza.formato))}
                editable={t.estado !== "hecha"}
              />
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Comentarios">
        <Comentarios piezaId={pieza.id} comentarios={(comentarios ?? []).map((c) => ({ id: c.id, texto: c.texto, cuando: fechaHora(c.created_at), autor: c.autor?.nombre ?? "?" }))} />
      </Seccion>

      <AccionesPieza piezaId={pieza.id} estado={pieza.estado} rol={rol} />
    </article>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{titulo}</h2>
      {children}
    </section>
  );
}

function Dato({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function normalizarChecklist(raw: unknown, porDefecto: string[]): { texto: string; hecho: boolean }[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((x) =>
      typeof x === "string" ? { texto: x, hecho: false } : { texto: String((x as { texto?: unknown })?.texto ?? ""), hecho: Boolean((x as { hecho?: unknown })?.hecho) },
    );
  }
  return porDefecto.map((texto) => ({ texto, hecho: false }));
}
