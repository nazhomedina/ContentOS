import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { fechaCorta, hoyISO, lunesDeHoy, DIAS_SEMANA } from "@/lib/dominio/tiempo";
import { NOMBRE_META, resumenSistema, type NodoEstado } from "@/lib/dominio/nodo";
import { semaforoBuffer } from "@/lib/dominio/buffer";
import { NOMBRE_TIPO_HISTORIA } from "@/lib/dominio/historias";
import { numeroEdicion } from "@/lib/dominio/newsletter";
import { InsigniaEstado } from "@/components/app/insignias";
import { BotonAprobarHistorias } from "@/components/hoy/aprobar-historias";
import { Captura } from "@/components/pieza/captura";
import { AhoraPersona } from "@/components/equipo/ahora";
import { cn } from "@/lib/utils";

export const metadata = { title: "Inicio" };
export const dynamic = "force-dynamic";

type Slot = { id?: string; id_publico?: string; titulo?: string | null; estado?: string; dia?: number; tipo?: string };
type Pendiente = { clave: string; texto: React.ReactNode; detalle: string; href: string; tono?: "rojo" | "ambar" };

/**
 * El tablero de Nazho (docs/decisiones.md 2026-09-16 · Inicio, Opción C): cuatro cifras, los sensores de
 * crecimiento, las metas de la semana y la máquina. Lo que espera su mano aparece como lista solo cuando hay algo.
 * Mariela no entra aquí: su inicio es la Cola.
 */
export default async function Inicio() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  if (sesion.perfil.rol !== "owner") redirect("/");
  const supabase = await crearClienteServidor();
  const semana = lunesDeHoy();
  const hoy = hoyISO();

  const [{ data: propuestas }, { data: bloqueadas }, { data: grabar }, { data: buffer }, { data: cuota }, { data: latidos }, { data: sistemas }, { data: editores }, { data: ind }, { data: produccion }, { data: enKit }, { data: porResolver }] = await Promise.all([
    supabase.from("historias").select("id, dia, tipo, copy").eq("semana", semana).eq("estado", "propuesta").order("dia"),
    supabase.from("tareas").select("id, tipo, nota_bloqueo, vence, pieza:piezas(id, id_publico, titulo), asignado:perfiles!tareas_asignado_a_fkey(nombre)").eq("estado", "bloqueada").order("vence"),
    supabase.from("tareas").select("id, vence, pieza:piezas(id, id_publico, titulo, tipo)").eq("tipo", "grabar").neq("estado", "hecha").order("vence"),
    supabase.from("piezas").select("id").in("estado", ["listo", "programada"]),
    supabase.rpc("cuota_semana", { p_semana: semana }),
    supabase.rpc("latidos"),
    supabase.from("sistemas").select("clave, nombre").eq("activo", true).order("orden"),
    supabase.from("perfiles").select("user_id, nombre").eq("rol", "editor").order("nombre"),
    supabase.from("indicadores_semana").select("*").order("semana", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("piezas").select("estado").in("estado", ["redaccion", "grabacion", "diseno"]),
    supabase.from("piezas").select("id, id_publico, titulo, fecha_objetivo").eq("tipo", "newsletter").eq("estado", "diseno").order("fecha_objetivo"),
    supabase.from("hipotesis").select("id, texto, campo, numero, fecha").eq("estado", "abierta").not("fecha", "is", null).lte("fecha", hoy).order("fecha").limit(5),
  ]);

  const estados = await Promise.all((sistemas ?? []).map(async (x) => {
    const { data } = await supabase.rpc("estado_nodos", { p_clave: x.clave, p_semana: semana });
    return { ...x, nodos: (data ?? []) as NodoEstado[] };
  }));

  const orden = ["newsletter", "reel", "carrusel", "historia_dia"];
  const filas = (cuota ?? []).sort((a, b) => orden.indexOf(a.tipo) - orden.indexOf(b.tipo));
  const meta = filas.reduce((a, f) => a + f.meta, 0), pub = filas.reduce((a, f) => a + f.publicadas, 0);
  const nBuffer = (buffer ?? []).length;
  const sem = semaforoBuffer(nBuffer);
  const prod = { total: (produccion ?? []).length, grabacion: (produccion ?? []).filter((p) => p.estado === "grabacion").length, diseno: (produccion ?? []).filter((p) => p.estado === "diseno").length };
  const atrasados = (latidos ?? []).filter((l) => l.atrasado).length;
  const sinSensor = [ind?.seguidores, ind?.suscriptores, ind?.leads].filter((v) => v == null).length;

  // Lo que solo Nazho puede hacer, en un solo lugar.
  const pendientes: Pendiente[] = [
    ...(propuestas ?? []).length > 0 ? [{ clave: "aprobar", texto: <>Aprobar <b>{propuestas!.length}</b> {propuestas!.length === 1 ? "historia" : "historias"} de esta semana</>, detalle: propuestas!.map((h) => `${DIAS_SEMANA[(h.dia ?? 1) - 1]} · ${NOMBRE_TIPO_HISTORIA[h.tipo] ?? h.tipo}`).join(" · "), href: "/historias" }] : [],
    ...(bloqueadas ?? []).map((t) => ({ clave: `b-${t.id}`, texto: <>Destrabar a {t.asignado?.nombre ?? "Mariela"}: <b>{t.tipo}</b> {t.pieza?.id_publico}</>, detalle: t.nota_bloqueo ?? "", href: t.pieza ? `/piezas/${t.pieza.id}` : "/cola", tono: "rojo" as const })),
    ...(enKit ?? []).map((p) => ({ clave: `k-${p.id}`, texto: <>Programar <b>{numeroEdicion(p.titulo) ?? p.id_publico}</b> en Kit para el {fechaCorta(p.fecha_objetivo)}</>, detalle: "está en Kit como borrador · al programarla pasa a lista", href: `/piezas/${p.id}`, tono: "ambar" as const })),
    ...(grabar ?? []).map((t) => ({ clave: `g-${t.id}`, texto: <>Grabar <b>{t.pieza?.id_publico}</b> {t.pieza?.titulo}</>, detalle: t.vence ? `vence ${fechaCorta(t.vence)}` : "sin fecha", href: t.pieza ? `/piezas/${t.pieza.id}` : "/cola" })),
    ...(porResolver ?? []).map((x) => ({ clave: `h-${x.id}`, texto: <>Resolver la hipótesis «{x.texto.slice(0, 70)}{x.texto.length > 70 ? "…" : ""}»</>, detalle: `${x.campo} ≥ ${x.numero} · venció ${fechaCorta(x.fecha)}`, href: "/hipotesis", tono: "ambar" as const })),
  ];
  const clases = Array.from(new Set(pendientes.map((p) => p.clave.split("-")[0])));
  const NOMBRE_CLASE: Record<string, string> = { aprobar: "aprobar", b: "destrabar", k: "programar", g: "grabar", h: "resolver" };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{fechaCorta(hoy)} · semana del {fechaCorta(semana)}</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Inicio</h1>
        </div>
        <div className="w-full max-w-md"><Captura /></div>
      </header>

      {/* 1 · Cuatro cifras */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra etiqueta="Publicadas esta semana" valor={`${pub} / ${meta}`} tono={pub >= meta ? "ok" : pub > 0 ? "ambar" : "rojo"} nota="meta declarada" />
        <Cifra etiqueta="Buffer" valor={nBuffer} tono={sem} nota={sem === "ok" ? "sano · ≥ 5" : sem === "ambar" ? "atención · sano es ≥ 5" : "vacío · sano es ≥ 5"} href="/reels?vista=lista&estado=listo" />
        <Cifra etiqueta="En producción" valor={prod.total} nota={`${prod.grabacion} en grabación · ${prod.diseno} en diseño`} href="/reels" />
        <Cifra etiqueta="Esperan tu mano" valor={pendientes.length} tono={pendientes.some((p) => p.tono === "rojo") ? "rojo" : pendientes.length > 0 ? "ambar" : undefined} nota={pendientes.length === 0 ? "nada por hoy" : clases.map((c) => NOMBRE_CLASE[c]).join(", ")} />
      </div>

      {/* 2 · Sensores */}
      <div className="grid grid-cols-3 gap-3">
        <Kpi etiqueta="Seguidores @nazho" valor={ind?.seguidores} corte={ind?.seguidores_corte} fuente="snapshot" />
        <Kpi etiqueta="Suscriptores CRITERIO" valor={ind?.suscriptores} corte={ind?.suscriptores_corte} fuente="Kit" />
        <Kpi etiqueta="Leads" valor={ind?.leads} corte={ind?.leads_corte} fuente="go.folklore" />
      </div>

      {/* 3 · Lo que espera tu mano, solo cuando hay algo */}
      {pendientes.length > 0 && (
        <Bloque titulo="Esperan tu mano" acento>
          <ul className="divide-y rounded-lg border text-sm">
            {pendientes.map((p) => (
              <li key={p.clave} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className={cn("block", p.tono === "rojo" && "text-rojo")}>{p.texto}</span>
                  {p.detalle && <span className={cn("block text-xs", p.tono === "rojo" ? "text-rojo" : p.tono === "ambar" ? "text-ambar" : "text-muted-foreground")}>{p.detalle}</span>}
                </span>
                {p.clave === "aprobar" ? <BotonAprobarHistorias semana={semana} n={propuestas!.length} compacto /> : <Link href={p.href} className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted">Abrir</Link>}
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      {/* 4 · Metas de la semana */}
      <Bloque titulo="Metas de la semana">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filas.map((f) => {
            const slots = (f.piezas as Slot[]) ?? [];
            const llenos = f.tipo === "historia_dia" ? new Set(slots.map((x) => x.dia)).size : slots.length;
            const vacios = Math.max(0, f.meta - llenos);
            const ruta = f.tipo === "historia_dia" ? "/historias" : f.tipo === "reel" ? "/reels" : f.tipo === "carrusel" ? "/carruseles" : "/newsletter";
            return (
              <div key={f.tipo} className="space-y-2 rounded-xl border p-3">
                <div className="flex items-baseline justify-between">
                  <Link href={ruta} className="text-sm font-semibold hover:underline">{NOMBRE_META[f.tipo] ?? f.tipo}</Link>
                  <p className="text-sm"><span className={cn("text-xl font-extrabold", f.publicadas >= f.meta && "text-ok")}>{f.publicadas}</span><span className="text-muted-foreground"> / {f.meta}</span></p>
                </div>
                <ul className="space-y-1 text-xs">
                  {f.tipo === "historia_dia"
                    ? Array.from(new Set(slots.map((x) => x.dia!))).sort().map((d) => <li key={d} className="truncate rounded bg-muted/60 px-2 py-1"><Link href={`/historias?semana=${semana}`} className="hover:underline">{DIAS_SEMANA[d - 1]}</Link> · {slots.filter((x) => x.dia === d).map((x) => NOMBRE_TIPO_HISTORIA[x.tipo ?? ""] ?? x.tipo).join(", ")}</li>)
                    : slots.map((p) => <li key={p.id} className="flex items-center justify-between gap-1 rounded bg-muted/60 px-2 py-1"><Link href={`/piezas/${p.id}`} className="truncate hover:underline">{p.titulo ?? p.id_publico}</Link>{p.estado === "diseno" && f.tipo === "newsletter" ? <span className="shrink-0 text-[11px] text-ambar">en Kit</span> : <InsigniaEstado estado={p.estado!} />}</li>)}
                  {Array.from({ length: vacios }).map((_, i) => <li key={`v${i}`} className="rounded border border-dashed border-rojo/50 px-2 py-1 text-rojo">Hueco</li>)}
                </ul>
              </div>
            );
          })}
        </div>
      </Bloque>

      {/* 5 · La máquina y el equipo */}
      <Bloque titulo="La máquina" extra={<span className="text-muted-foreground">{atrasados > 0 ? <span className="text-rojo">{atrasados} latidos atrasados</span> : "latidos al día"}{sinSensor > 0 && <> · {sinSensor} sensores sin dato</>} · <Link href="/sistemas" className="underline">sistemas</Link></span>}>
        <ul className="divide-y rounded-lg border text-sm">
          {estados.map((sx) => {
            const r = resumenSistema(sx.nodos);
            return (
              <li key={sx.clave}>
                <Link href={`/sistemas?sistema=${sx.clave}`} className="flex items-center gap-4 px-3 py-2 hover:bg-muted/50">
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{sx.nombre}</span>
                  <span className="flex h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                    {r.corrio > 0 && <span className="bg-ok" style={{ width: `${(r.corrio / r.total) * 100}%` }} />}
                    {r.hueco > 0 && <span className="bg-muted-foreground" style={{ width: `${(r.hueco / r.total) * 100}%` }} />}
                    {r.agendado > 0 && <span className="bg-ambar" style={{ width: `${(r.agendado / r.total) * 100}%` }} />}
                    {r.sin_sistema > 0 && <span className="bg-rojo" style={{ width: `${(r.sin_sistema / r.total) * 100}%` }} />}
                  </span>
                </Link>
              </li>
            );
          })}
          {(editores ?? []).map((e) => (
            <li key={e.user_id} className="space-y-1 px-3 py-2">
              <Link href={`/equipo?persona=${e.user_id}`} className="text-xs font-semibold hover:underline">{e.nombre}</Link>
              <AhoraPersona perfilId={e.user_id} />
            </li>
          ))}
          {(editores ?? []).length === 0 && <li className="px-3 py-2 text-xs text-muted-foreground">Mariela todavía no entra. Genera su código en <Link href="/accesos" className="underline">Accesos</Link>.</li>}
        </ul>
      </Bloque>
    </div>
  );
}

function Bloque({ titulo, children, acento, extra }: { titulo: string; children: React.ReactNode; acento?: boolean; extra?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={cn("text-xs font-bold uppercase tracking-wider", acento ? "text-primary" : "text-muted-foreground")}>{titulo}</h2>
        {extra && <span className="text-xs">{extra}</span>}
      </div>
      {children}
    </section>
  );
}

function Cifra({ etiqueta, valor, nota, tono, href }: { etiqueta: string; valor: string | number; nota: string; tono?: "ok" | "ambar" | "rojo"; href?: string }) {
  const cuerpo = (
    <>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className={cn("text-2xl font-extrabold tabular-nums tracking-tight", tono === "ok" && "text-ok", tono === "ambar" && "text-ambar", tono === "rojo" && "text-rojo")}>{valor}</p>
      <p className="text-[11px] text-muted-foreground">{nota}</p>
    </>
  );
  return href ? <Link href={href} className="rounded-xl border p-3 hover:bg-muted/40">{cuerpo}</Link> : <div className="rounded-xl border p-3">{cuerpo}</div>;
}

function Kpi({ etiqueta, valor, corte, fuente }: { etiqueta: string; valor: number | null | undefined; corte: string | null | undefined; fuente: string }) {
  const sin = valor == null;
  return (
    <div className={cn("rounded-xl border p-3", sin && "border-dashed")}>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className={cn("text-2xl font-extrabold tabular-nums", sin && "text-muted-foreground/50")}>{sin ? "—" : valor.toLocaleString("es-MX")}</p>
      <p className="text-[11px] text-muted-foreground">{sin ? <span className="text-rojo">sin sensor</span> : `${fuente} · corte ${corte ? fechaCorta(corte) : "?"}`}</p>
    </div>
  );
}
