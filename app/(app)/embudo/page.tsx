import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor, sesionActual } from "@/lib/supabase/server";
import { fechaCorta, lunesDeHoy } from "@/lib/dominio/tiempo";
import { cn } from "@/lib/utils";

export const metadata = { title: "Embudo" };
export const dynamic = "force-dynamic";

type Sensor = { etiqueta: string; valor: string | number | null; fuente: string; corte?: string | null; sinSensor?: boolean };

export default async function Embudo() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");
  const supabase = await crearClienteServidor();
  const semana = lunesDeHoy();

  const [{ data: ind }, { data: piezasSemana }, { data: recursos }, { data: historias }, { data: campanas }, { data: views }] = await Promise.all([
    supabase.from("indicadores_semana").select("*").order("semana", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("piezas").select("id, id_publico, formato, etapa_embudo, estado, publicada_en").eq("estado", "publicada").gte("publicada_en", semana).order("publicada_en", { ascending: false }),
    supabase.from("recursos").select("id, nombre, keyword, slug_go, leads, leads_actualizado_en, estado").order("created_at"),
    supabase.from("historias").select("id, keyword, dms, replies, views, estado, recurso_id").eq("semana", semana),
    supabase.from("campanas").select("id, nombre, objetivo, presupuesto_semanal, activa").eq("activa", true),
    supabase.from("metricas").select("views, fecha, fuente").gte("fecha", semana).neq("fuente", "pendiente"),
  ]);

  const viewsSemana = (views ?? []).reduce((a, m) => a + (m.views ?? 0), 0);
  const dms = (historias ?? []).reduce((a, h) => a + (h.dms ?? 0), 0);
  const conKeyword = (historias ?? []).filter((h) => h.keyword && h.estado === "publicada").length;
  const leads = (recursos ?? []).reduce((a, r) => a + (r.leads ?? 0), 0);
  const frias = (campanas ?? []).filter((c) => c.objetivo === "frio");
  const calidas = (campanas ?? []).filter((c) => c.objetivo === "calido");
  const publicadasPor = (etapa: string) => (piezasSemana ?? []).filter((p) => p.etapa_embudo === etapa).length;

  const anillos: { nombre: string; que: string; canales: string; sensores: Sensor[] }[] = [
    {
      nombre: "Atraer", que: "Alcance en no seguidores", canales: "Reels · carruseles · pauta fría",
      sensores: [
        { etiqueta: "Piezas publicadas (atraer)", valor: publicadasPor("atraer"), fuente: "piezas · esta semana" },
        { etiqueta: "Views capturadas", valor: (views ?? []).length ? viewsSemana : null, fuente: "metricas (Apify)", sinSensor: (views ?? []).length === 0 },
        { etiqueta: "Alcance de pauta fría", valor: frias.length ? `${frias.length} campañas` : null, fuente: "Meta Ads", sinSensor: true },
        { etiqueta: "Seguidores @nazho", valor: ind?.seguidores ?? null, fuente: "snapshot", corte: ind?.seguidores_corte, sinSensor: ind?.seguidores == null },
      ],
    },
    {
      nombre: "Capturar", que: "Convertir atención en dato", canales: "Historias + keyword → recurso → Kit · pixel → audiencias cálidas",
      sensores: [
        { etiqueta: "Historias con keyword publicadas", valor: conKeyword, fuente: "historias · esta semana" },
        { etiqueta: "DMs por keyword", valor: (historias ?? []).some((h) => h.dms != null) ? dms : null, fuente: "captura manual", sinSensor: !(historias ?? []).some((h) => h.dms != null) },
        { etiqueta: "Leads en go.folklore", valor: (recursos ?? []).some((r) => r.leads != null) ? leads : null, fuente: "go_leads", sinSensor: !(recursos ?? []).some((r) => r.leads != null) },
        { etiqueta: "Suscriptores CRITERIO", valor: ind?.suscriptores ?? null, fuente: "Kit", corte: ind?.suscriptores_corte, sinSensor: ind?.suscriptores == null },
        { etiqueta: "Audiencias cálidas (pixel)", valor: calidas.length ? `${calidas.length} campañas` : null, fuente: "Meta Ads", sinSensor: true },
      ],
    },
    {
      nombre: "Convertir", que: "Vender", canales: "CRITERIO · bienvenida · landing · libro NUM",
      sensores: [
        { etiqueta: "Ediciones enviadas", valor: (piezasSemana ?? []).filter((p) => p.formato === "newsletter").length, fuente: "piezas · esta semana" },
        { etiqueta: "Ventas del libro", valor: null, fuente: "Stripe", sinSensor: true },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Embudo · semana del {fechaCorta(semana)}</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Atraer → Capturar → Convertir</h1>
        <p className="text-sm text-muted-foreground">Cada número trae su sensor y su corte. Lo que no tiene sensor se ve vacío a propósito.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {anillos.map((a, i) => (
          <section key={a.nombre} className={cn("space-y-4 rounded-xl border p-4", i === 1 && "lg:-mx-0")}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Anillo {i + 1}</p>
              <h2 className="text-xl font-extrabold">{a.nombre}</h2>
              <p className="text-sm">{a.que}</p>
              <p className="text-xs text-muted-foreground">{a.canales}</p>
            </div>
            <ul className="space-y-2">
              {a.sensores.map((s) => (
                <li key={s.etiqueta} className={cn("rounded-lg border p-3", s.sinSensor && "border-dashed")}>
                  <p className="text-xs text-muted-foreground">{s.etiqueta}</p>
                  <p className={cn("text-2xl font-extrabold", s.sinSensor && "text-muted-foreground/50")}>{s.valor ?? "—"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.sinSensor ? <span className="text-rojo">sin sensor</span> : s.fuente}
                    {s.corte && ` · corte ${fechaCorta(s.corte)}`}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lead magnets (recursos con gate)</h2>
        {(recursos ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Sin recursos. Llegan con el import de Notion.</p> : (
          <ul className="divide-y rounded-lg border text-sm">
            {recursos!.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span><span className="font-semibold">{r.nombre}</span>{r.keyword && <span className="ml-2 font-mono text-xs text-muted-foreground">«{r.keyword}»</span>}</span>
                <span className="text-xs text-muted-foreground">
                  {r.slug_go && <a href={`https://go.folklore.mx/${r.slug_go}`} target="_blank" rel="noreferrer" className="underline">go/{r.slug_go}</a>}
                  {" · "}{r.leads != null ? `${r.leads} leads` : "leads sin sensor"} · {r.estado}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Los sensores de pauta (Meta Ads), seguidores, suscriptores y leads se conectan en el sprint 2 como jobs con latido. Ver <Link href="/maquina?sistema=pauta_pixel" className="underline">Pauta y pixel</Link>.
      </p>
    </div>
  );
}
