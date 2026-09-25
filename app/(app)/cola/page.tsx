import Link from "next/link";
import { LayoutTemplate } from "lucide-react";
import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { fechaCorta, hoyISO, lunesDeHoy, sumarDias, DIAS_SEMANA } from "@/lib/dominio/tiempo";
import { NOMBRE_TIPO, type Tipo } from "@/lib/dominio/estados";
import { NOMBRE_TIPO_HISTORIA } from "@/lib/dominio/historias";
import { BOLSAS, COLUMNAS, NOMBRE_OBJETIVO, ORDEN_OBJETIVOS, PIE_BOLSA, pasaFiltro, resumenFaltan, type Bolsa, type Objetivo } from "@/lib/dominio/tablero";
import { IdPublico } from "@/components/app/insignias";
import { Objetivos } from "@/components/tablero/objetivos";
import { Filtros } from "@/components/tablero/filtros";
import { BotonLista, BotonProgramar, BotonPublicadaHistoria, BotonPublicadaPieza, BotonTomar, CopiarTexto } from "@/components/tablero/acciones";
import { MiDia, type EntradaDia } from "@/components/tablero/mi-dia";
import { cn } from "@/lib/utils";

export const metadata = { title: "Mi tablero" };
export const dynamic = "force-dynamic";

type Fila = {
  clave: string;
  id: string | null;
  idPublico: string;
  href: string;
  titulo: string;
  tipo: string | null;
  detalle: React.ReactNode;
  fecha: string;
  fechaTono: "normal" | "azul" | "ambar" | "rojo";
  destacada?: boolean;
  maqueta?: "vigente" | "vieja";
  accion: React.ReactNode;
};

const nombreTipo = (t: string | null) => NOMBRE_TIPO[t as Tipo] ?? t ?? "";

/**
 * La pantalla de Mariela (docs/decisiones.md 2026-09-25): objetivos de la semana arriba y una sola tabla con tres bolsas.
 * Listo para publicar es el buffer del que sale la meta; Para trabajar es lo grabado por Nazho y lo escrito con texto final;
 * En mis manos es lo que ya tomó. Dos verbos en Listo (Programar, Publicada), uno en cada otra bolsa (Tomar, Lista).
 */
export default async function Tablero({ searchParams }: { searchParams: Promise<{ bolsa?: string; tipo?: string }> }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  const sp = await searchParams;
  const bolsa: Bolsa = (BOLSAS as readonly string[]).includes(sp.bolsa ?? "") ? (sp.bolsa as Bolsa) : "listo";
  const tipo = sp.tipo ?? "todo";
  const supabase = await crearClienteServidor();
  const esOwner = sesion.perfil.rol === "owner";
  const yo = sesion.userId;
  const hoy = hoyISO();
  const semana = lunesDeHoy();
  const finSemana = sumarDias(semana, 6);

  const [{ data: cuota }, { data: buffer }, { data: historias }, { data: material }, { data: dia }] = await Promise.all([
    supabase.rpc("cuota_semana", { p_semana: semana }),
    supabase.from("piezas").select("id, id_publico, titulo, tipo, estado, fecha_objetivo, updated_at").in("estado", ["listo", "programada"]).order("fecha_objetivo", { ascending: true, nullsFirst: false }).order("updated_at", { ascending: true }),
    supabase.from("historias").select("id, tipo, registro, copy, keyword, dia, semana, estado, asset_url").eq("semana", semana).in("estado", ["aprobada", "programada"]).order("dia").order("orden"),
    supabase.rpc("tablero_material"),
    supabase.from("bitacora").select("id, texto, minutos, origen, created_at, pieza:piezas(id_publico)").eq("perfil_id", yo).eq("fecha", hoy).order("created_at"),
  ]);
  const { data: maquetas } = await supabase.from("maqueta_actual").select("pieza_id, desactualizada");
  const maquetaDe = new Map((maquetas ?? []).map((m) => [m.pieza_id as string, m.desactualizada ? "vieja" as const : "vigente" as const]));

  // Objetivos ------------------------------------------------------------------------------------------------------------
  const buffers = { reel: (buffer ?? []).filter((p) => ["reel", "yap", "youtube"].includes(p.tipo ?? "")).length, carrusel: (buffer ?? []).filter((p) => p.tipo === "carrusel").length, newsletter: (buffer ?? []).filter((p) => p.tipo === "newsletter").length };
  const objetivos: Objetivo[] = (cuota ?? [])
    .filter((c) => ORDEN_OBJETIVOS.includes(c.tipo))
    .sort((a, b) => ORDEN_OBJETIVOS.indexOf(a.tipo) - ORDEN_OBJETIVOS.indexOf(b.tipo))
    .map((c) => {
      const faltan = Math.max(0, c.meta - c.publicadas - c.en_camino);
      const cumplido = c.publicadas >= c.meta;
      let contexto = "";
      let tono: Objetivo["tono"] = cumplido ? "ok" : "normal";
      if (c.tipo === "historia_dia") contexto = cumplido ? "semana cumplida" : `${(historias ?? []).length} ${(historias ?? []).length === 1 ? "aprobada" : "aprobadas"}`;
      else if (c.tipo === "newsletter") contexto = cumplido ? "enviado" : c.en_camino > 0 ? "en camino" : buffers.newsletter > 0 ? "listo para enviar" : "falta armarlo";
      else {
        const b = c.tipo === "reel" ? buffers.reel : buffers.carrusel;
        if (cumplido) contexto = "semana cumplida";
        else if (b === 0 && c.en_camino === 0) { contexto = "buffer vacío"; tono = "rojo"; }
        else contexto = `${b} en buffer${c.en_camino > 0 ? ` · ${c.en_camino} programad${c.en_camino === 1 ? "o" : "os"}` : ""}`;
      }
      return { tipo: c.tipo, nombre: NOMBRE_OBJETIVO[c.tipo] ?? c.tipo, meta: c.meta, publicadas: c.publicadas, enCamino: c.en_camino, faltan, contexto, tono };
    });
  const metaDestraba = new Set(objetivos.filter((o) => o.faltan > 0).map((o) => (o.tipo === "historia_dia" ? "historia" : o.tipo)));

  // Bolsa 1 · Listo para publicar -----------------------------------------------------------------------------------------
  const filasListo: Fila[] = [
    ...(buffer ?? []).map((p): Fila => {
      const conFecha = !!p.fecha_objetivo;
      const vencida = conFecha && p.fecha_objetivo! < hoy;
      return {
        clave: `p-${p.id}`, id: p.id, idPublico: p.id_publico ?? "—", href: `/piezas/${p.id}`, titulo: p.titulo ?? "(sin título)", tipo: p.tipo,
        detalle: <>{p.estado === "programada" ? "programada" : "lista"} · desde {fechaCorta(p.updated_at)}</>,
        fecha: conFecha ? `${fechaCorta(p.fecha_objetivo)}${vencida ? " · venció" : ""}` : "sin fecha",
        fechaTono: vencida ? "rojo" : conFecha ? "azul" : "normal",
        accion: conFecha
          ? <><BotonProgramar piezaId={p.id} fechaActual={p.fecha_objetivo} variante="ghost" /><BotonPublicadaPieza piezaId={p.id} tipo={p.tipo} idPublico={p.id_publico ?? ""} /></>
          : <><BotonPublicadaPieza piezaId={p.id} tipo={p.tipo} idPublico={p.id_publico ?? ""} /><BotonProgramar piezaId={p.id} /></>,
      };
    }),
    ...(historias ?? []).map((h): Fila => {
      const fechaH = h.semana && h.dia ? sumarDias(h.semana, h.dia - 1) : null;
      const esHoy = fechaH === hoy;
      return {
        clave: `h-${h.id}`, id: null, idPublico: "HIS", href: `/historias?semana=${h.semana}`, tipo: "historia",
        titulo: `${NOMBRE_TIPO_HISTORIA[h.tipo] ?? h.tipo}${h.keyword ? ` · ${h.keyword}` : ""}`,
        detalle: (
          <span className="flex min-w-0 items-center gap-2">
            {h.copy ? <><span className="truncate" title={h.copy}>{h.copy}</span><CopiarTexto texto={h.copy} /></> : <span>{h.registro === "producido" ? "producido · arte en Historias" : "orgánico"}</span>}
          </span>
        ),
        fecha: fechaH ? (esHoy ? "hoy" : `${DIAS_SEMANA[h.dia! - 1].toLowerCase().slice(0, 3)} ${fechaCorta(fechaH).split(" ")[1]}`) : "sin día",
        fechaTono: esHoy ? "azul" : fechaH && fechaH < hoy ? "rojo" : "normal",
        accion: <BotonPublicadaHistoria historiaId={h.id} />,
      };
    }),
  ].sort((a, b) => (a.fecha === "sin fecha" || a.fecha === "sin día" ? 1 : 0) - (b.fecha === "sin fecha" || b.fecha === "sin día" ? 1 : 0));

  // Bolsas 2 y 3 · Material y En mis manos -------------------------------------------------------------------------------
  const materialTodo = material ?? [];
  const mias = materialTodo.filter((m) => m.tarea_id && m.tarea_de === yo);
  const libres = materialTodo.filter((m) => !m.tarea_id || (esOwner && m.tarea_de !== yo));
  const filaMaterial = (m: (typeof materialTodo)[number], enManos: boolean): Fila => {
    const video = ["reel", "yap", "youtube", "historia"].includes(m.tipo ?? "");
    const queHay = m.ultimo_asset
      ? `${m.asset_carpeta === "raw" ? "RAW" : m.asset_carpeta} · ${m.ultimo_asset}${m.asset_en ? ` · ${fechaCorta(m.asset_en)}` : ""}`
      : m.palabras > 0 ? `${video ? "guion" : "texto"} de ${m.palabras} palabras` : video ? "sin archivo todavía" : "sin texto todavía";
    const destraba = metaDestraba.has(video ? "reel" : m.tipo ?? "");
    return {
      clave: `m-${m.id}`, id: m.id, idPublico: m.id_publico ?? "—", href: `/piezas/${m.id}`, titulo: m.titulo ?? "(sin título)", tipo: m.tipo,
      detalle: enManos ? <>{m.tarea_tipo}{m.tarea_estado === "bloqueada" ? <span className="font-semibold text-rojo"> · bloqueada</span> : m.tarea_estado === "en_curso" ? " · en curso" : ""}</> : m.tarea_id ? <>{queHay} · <span className="text-muted-foreground">la tiene {m.tarea_de_nombre}</span></> : queHay,
      fecha: enManos ? fechaCorta(m.tarea_desde) : m.fecha_objetivo ? `sale ${fechaCorta(m.fecha_objetivo)}` : destraba ? "destraba la meta" : "sin prisa",
      fechaTono: enManos ? "normal" : m.fecha_objetivo && m.fecha_objetivo <= finSemana ? "ambar" : destraba ? "ambar" : "normal",
      destacada: !enManos && (destraba || (!!m.fecha_objetivo && m.fecha_objetivo <= finSemana)),
      accion: enManos ? <BotonLista piezaId={m.id} /> : m.tarea_id ? <span className="text-xs text-muted-foreground">ocupada</span> : <BotonTomar piezaId={m.id} />,
    };
  };
  const filasTrabajar = libres.map((m) => filaMaterial(m, false)).sort((a, b) => Number(b.destacada) - Number(a.destacada));
  const filasManos = mias.map((m) => filaMaterial(m, true));

  const porBolsa: Record<Bolsa, Fila[]> = { listo: filasListo, trabajar: filasTrabajar, manos: filasManos };
  const conteos: Record<Bolsa, number> = { listo: filasListo.length, trabajar: filasTrabajar.length, manos: filasManos.length };
  const filas = porBolsa[bolsa].filter((f) => pasaFiltro(tipo, f.tipo)).map((f) => (f.id && maquetaDe.has(f.id) ? { ...f, maqueta: maquetaDe.get(f.id) } : f));
  const columnas = COLUMNAS[bolsa];
  const nombre = sesion.perfil.nombre.split(" ")[0];
  const diaNombre = DIAS_SEMANA[(new Date(hoy + "T12:00:00Z").getUTCDay() + 6) % 7].toLowerCase();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Semana del {fechaCorta(semana).replace(/^\w+ /, "")} al {fechaCorta(finSemana).replace(/^\w+ /, "")}</h1>
        <p className="text-sm text-muted-foreground">
          Hola, {nombre}. Es {diaNombre}: <span className="font-semibold text-foreground">{resumenFaltan(objetivos)}</span>.
          {esOwner && <> Ves el tablero como lo ve Mariela; tus acciones aquí cuentan igual.</>}
        </p>
      </header>

      {objetivos.length > 0 ? <Objetivos objetivos={objetivos} /> : <p className="text-sm text-muted-foreground">Sin metas definidas para la semana.</p>}

      <section className="space-y-3">
        <Filtros bolsa={bolsa} tipo={tipo} conteos={conteos} />

        {filas.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {bolsa === "listo" && "Nada listo para publicar con ese filtro. Lo que termines en «En mis manos» aparece aquí."}
            {bolsa === "trabajar" && "No hay material libre con ese filtro. Cuando Nazho grabe o escriba algo nuevo, aparece aquí."}
            {bolsa === "manos" && "No has tomado nada. Ve a «Para trabajar» y pulsa Tomar en lo que vayas a hacer."}
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border">
            <li className="hidden grid-cols-[5.5rem_minmax(0,1fr)_6rem_minmax(0,18rem)_8.5rem_auto] gap-4 bg-muted/40 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground md:grid">
              <span>ID</span><span>Pieza</span><span>Tipo</span><span>{columnas.detalle}</span><span>{columnas.fecha}</span><span className="w-44 text-right">Acción</span>
            </li>
            {filas.map((f) => (
              <li key={f.clave} className={cn("grid gap-2 px-4 py-3 md:grid-cols-[5.5rem_minmax(0,1fr)_6rem_minmax(0,18rem)_8.5rem_auto] md:items-center md:gap-4", f.destacada && "bg-ambar/5")}>
                <div className="flex items-center gap-2 md:block"><IdPublico id={f.idPublico} /><span className="text-xs text-muted-foreground md:hidden">{nombreTipo(f.tipo)}</span></div>
                <span className="flex min-w-0 items-center gap-2">
                  <Link href={f.href} className="min-w-0 truncate font-semibold hover:underline">{f.titulo}</Link>
                  {f.maqueta && (
                    <Link href={`${f.href}?vista=maqueta`} title={f.maqueta === "vieja" ? "Tiene maqueta, pero el copy cambió después" : "Tiene maqueta"} aria-label={f.maqueta === "vieja" ? "Maqueta desactualizada" : "Ver maqueta"} className={cn("shrink-0 rounded p-0.5 hover:bg-muted", f.maqueta === "vieja" ? "text-ambar" : "text-primary")}>
                      <LayoutTemplate className="size-4" />
                    </Link>
                  )}
                </span>
                <span className="hidden text-sm text-muted-foreground md:block">{nombreTipo(f.tipo)}</span>
                <div className="min-w-0 text-sm text-muted-foreground">{f.detalle}</div>
                <span className={cn("text-sm", f.fechaTono === "azul" && "font-semibold text-primary", f.fechaTono === "ambar" && "font-semibold text-ambar", f.fechaTono === "rojo" && "font-semibold text-rojo", f.fechaTono === "normal" && "text-muted-foreground")}>{f.fecha}</span>
                <div className="flex flex-wrap items-center gap-1.5 md:w-44 md:justify-end">{f.accion}</div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">{PIE_BOLSA[bolsa]}</p>
      </section>

      <MiDia hoy={hoy} entradas={(dia ?? []) as unknown as EntradaDia[]} />
    </div>
  );
}
