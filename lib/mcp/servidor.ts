import "server-only";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import type { Database, Perfil, TablesInsert, TablesUpdate } from "@/lib/supabase/tipos";
import { lunesDeHoy } from "@/lib/dominio/tiempo";
import { MARCA } from "@/lib/dominio/marca";

type Cliente = SupabaseClient<Database>;

const uuid = z.string().uuid();
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "AAAA-MM-DD");

/** Toda tool de escritura deja latido. Se usa service_role solo para esto: corridas es bitácora. */
async function corrida(sistema: string, resumen: string, payload: Record<string, unknown>, actor: Perfil) {
  await crearClienteAdmin().rpc("registrar_corrida", { p_sistema: sistema, p_estado: "ok", p_resumen: resumen, p_payload: { ...payload, actor: actor.user_id, via: "mcp" } });
}

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 0) }] };
}
function error(msg: string) {
  return { isError: true, content: [{ type: "text" as const, text: msg }] };
}
function limpiarError(m: string) {
  return m.replace(/^.*?:\s*(?=[A-ZÁÉÍÓÚ¿«])/, "");
}

export function crearServidorMcp(supabase: Cliente, perfil: Perfil) {
  const server = new McpServer({ name: MARCA.nombre, version: "0.1.0" });

  // -------------------------------------------------------------------------
  // Contexto
  // -------------------------------------------------------------------------
  server.registerTool("listar_comunidades", {
    description: "Comunidades activas con ICP, dolor, promesa y tono. Léela al arrancar cualquier skill.",
    inputSchema: {},
  }, async () => {
    const { data, error: e } = await supabase.from("comunidades").select("id, nombre, icp, dolor, promesa, tono_default, canales").eq("activa", true).order("nombre");
    return e ? error(e.message) : json(data);
  });

  server.registerTool("latidos", {
    description: "Última corrida por sistema automático y si está atrasado respecto a su cadencia.",
    inputSchema: {},
  }, async () => {
    const { data, error: e } = await supabase.rpc("latidos");
    return e ? error(e.message) : json(data);
  });

  // -------------------------------------------------------------------------
  // Piezas
  // -------------------------------------------------------------------------
  server.registerTool("crear_pieza", {
    description: "Crea una pieza. Una pieza nace como idea con solo un título. Para estado para_producir hace falta formato; de para_grabar en adelante hacen falta formato, etapa_embudo e hipótesis {texto, campo, numero, fecha}. id_publico se genera solo si no se manda. Devuelve error legible si falta algo.",
    inputSchema: {
      titulo: z.string().min(3),
      estado: z.enum(["idea", "para_producir", "para_grabar", "edicion"]).default("idea"),
      formato: z.enum(["reel", "yap", "carrusel", "historia", "x", "canal_ig", "newsletter", "articulo", "youtube"]).optional(),
      notas: z.string().optional().describe("tensión, ángulo, contexto"),
      origen: z.enum(["radar", "voz", "destilado", "markie", "coyuntura", "audiencia", "claude", "legado", "nazho"]).default("claude"),
      id_publico: z.string().regex(/^[A-Z]{2,5}-\d{2,3}([a-z]|-[A-E])?$/).optional(),
      serie: z.string().optional(), format_card: z.string().optional().describe("código FC-08 o uuid"),
      hipotesis: z.object({ texto: z.string().min(3), campo: z.string().min(2), numero: z.number(), fecha }).optional(),
      etapa_embudo: z.enum(["atraer", "capturar", "convertir"]).optional(), cta: z.string().optional(),
      guion: z.string().optional(), spec_visual: z.string().optional(),
      fidelidad: z.enum(["mis_palabras", "reescribe"]).optional(), fecha_objetivo: fecha.optional(),
      responsable: z.string().optional().describe("nombre o user_id"), programa_aprobado: z.boolean().optional(),
    },
  }, async (v) => {
    let responsable_id: string | undefined;
    if (v.responsable) responsable_id = await resolverPersona(supabase, v.responsable) ?? undefined;
    const { data, error: e } = await supabase.rpc("crear_pieza_validada", { payload: { ...v, responsable_id, responsable: undefined } });
    return e ? error(limpiarError(e.message)) : json(data);
  });

  server.registerTool("actualizar_pieza", {
    description: "Desarrolla o actualiza una pieza (así es como Claude convierte una idea en pieza): formato, hipótesis {texto, campo, numero, fecha}, etapa_embudo, format_card, guion, spec_visual, título, serie, cta, notas, fecha_objetivo, responsable, fidelidad y estado. Para publicar se usa marcar_publicada desde la app. Acepta pieza_id o id_publico.",
    inputSchema: {
      pieza: z.string().describe("uuid o id_publico"),
      titulo: z.string().optional(), notas: z.string().nullable().optional(), serie: z.string().optional(), cta: z.string().optional(),
      formato: z.enum(["reel", "yap", "carrusel", "historia", "x", "canal_ig", "newsletter", "articulo", "youtube"]).optional(),
      etapa_embudo: z.enum(["atraer", "capturar", "convertir"]).optional(),
      hipotesis: z.object({ texto: z.string().min(3), campo: z.string().min(2), numero: z.number(), fecha }).optional(),
      format_card: z.string().optional().describe("código FC-08 o uuid"),
      guion: z.string().optional(), spec_visual: z.string().optional(), fecha_objetivo: fecha.nullable().optional(),
      responsable: z.string().nullable().optional(), fidelidad: z.enum(["mis_palabras", "reescribe"]).optional(),
      programa_aprobado: z.boolean().optional(), estado: z.enum(["idea", "para_producir", "para_grabar", "edicion", "buffer", "programada", "archivada", "en_trial"]).optional(),
    },
  }, async ({ pieza, responsable, estado, format_card, ...campos }) => {
    const { data: ref } = await supabase.from("piezas").select("id").or(`id_publico.eq.${pieza},id.eq.${uuidOrNil(pieza)}`).maybeSingle();
    if (!ref) return error(`No existe la pieza ${pieza}.`);
    const pieza_id = ref.id;
    const cambios: TablesUpdate<"piezas"> = { ...campos };
    if (responsable !== undefined) cambios.responsable_id = responsable === null ? null : await resolverPersona(supabase, responsable);
    if (format_card !== undefined) {
      const { data: fc } = await supabase.from("format_cards").select("id").or(`codigo.eq.${format_card},id.eq.${uuidOrNil(format_card)}`).maybeSingle();
      if (!fc) return error(`No existe la Format Card ${format_card}.`);
      cambios.format_card_id = fc.id;
    }
    if (Object.keys(cambios).length) {
      const { error: e } = await supabase.from("piezas").update(cambios).eq("id", pieza_id);
      if (e) return error(limpiarError(e.message));
    }
    if (estado) {
      const { error: e } = await supabase.rpc("cambiar_estado_pieza", { p_pieza_id: pieza_id, p_nuevo_estado: estado });
      if (e) return error(limpiarError(e.message));
    }
    const { data } = await supabase.from("piezas").select().eq("id", pieza_id).single();
    await corrida("actualizar_pieza", `${data?.id_publico}: ${Object.keys(cambios).concat(estado ? ["estado"] : []).join(", ")}`, { pieza_id }, perfil);
    return json(data);
  });

  server.registerTool("listar_piezas", {
    description: "Piezas por estado (idea · para_producir · para_grabar · edicion · buffer · programada · publicada · en_trial · archivada), formato o semana objetivo. Sin filtros devuelve las no archivadas más recientes, ideas incluidas.",
    inputSchema: {
      estado: z.string().optional(), formato: z.string().optional(), semana: fecha.optional().describe("lunes; filtra por fecha_objetivo en esa semana"),
      limite: z.number().int().min(1).max(300).default(100),
    },
  }, async ({ estado, formato, semana, limite }) => {
    let q = supabase.from("piezas").select("id, id_publico, titulo, formato, serie, estado, etapa_embudo, hipotesis, notas, origen, fecha_objetivo, publicada_en, url, responsable:perfiles!piezas_responsable_id_fkey(nombre)").order("updated_at", { ascending: false }).limit(limite);
    if (estado) q = q.eq("estado", estado); else q = q.neq("estado", "archivada");
    if (formato) q = q.eq("formato", formato);
    if (semana) q = q.gte("fecha_objetivo", semana).lt("fecha_objetivo", sumar(semana, 7));
    const { data, error: e } = await q;
    return e ? error(e.message) : json(data);
  });

  server.registerTool("listar_formatos", {
    description: "Las Format Cards: código, nombre, estado de validación y molde. Léelas antes de proponer o escribir una pieza.",
    inputSchema: {},
  }, async () => {
    const { data, error: e } = await supabase.from("format_cards").select("id, codigo, nombre, estado, origen, molde").order("codigo");
    return e ? error(e.message) : json(data);
  });

  // -------------------------------------------------------------------------
  // Tareas y cola
  // -------------------------------------------------------------------------
  server.registerTool("asignar_tarea", {
    description: "Crea una tarea en la cola de alguien (nombre o user_id): grabar · editar · diseñar · publicar · capturar_metricas · revisar.",
    inputSchema: {
      pieza_id: uuid.optional(), historia_id: uuid.optional(),
      tipo: z.enum(["grabar", "editar", "diseñar", "publicar", "capturar_metricas", "revisar"]),
      asignado_a: z.string(), vence: fecha, checklist: z.array(z.string()).optional(),
    },
  }, async (v) => {
    const { data, error: e } = await supabase.rpc("asignar_tarea", {
      p_tipo: v.tipo, p_asignado_a: v.asignado_a, p_vence: v.vence, p_pieza_id: v.pieza_id, p_historia_id: v.historia_id,
      p_checklist: (v.checklist ?? []).map((texto) => ({ texto, hecho: false })),
    });
    return e ? error(limpiarError(e.message)) : json(data);
  });

  server.registerTool("cola_de", {
    description: "Tareas de una persona por estado, con bloqueos y vencimientos. persona: nombre, user_id o 'todos'.",
    inputSchema: { persona: z.string().default("todos"), incluir_hechas: z.boolean().default(false) },
  }, async ({ persona, incluir_hechas }) => {
    let q = supabase.from("tareas").select("id, tipo, estado, vence, nota_bloqueo, hecha_en, checklist, asignado:perfiles!tareas_asignado_a_fkey(nombre), pieza:piezas(id_publico, titulo, formato, estado), historia:historias(semana, dia, serie)").order("vence", { ascending: true, nullsFirst: false });
    if (!incluir_hechas) q = q.neq("estado", "hecha");
    if (persona !== "todos") {
      const id = await resolverPersona(supabase, persona);
      if (!id) return error(`No encuentro a ${persona}.`);
      q = q.eq("asignado_a", id);
    }
    const { data, error: e } = await q;
    if (e) return error(e.message);
    const porEstado: Record<string, unknown[]> = {};
    for (const t of data ?? []) (porEstado[t.estado] ??= []).push(t);
    return json(porEstado);
  });

  server.registerTool("bitacora_de", {
    description: "Bitácora diaria de una persona (lo que declaró) junto a la evidencia automática (tareas hechas, estados movidos, archivos subidos), por día en un rango. Para el review y para saber en qué trabajó Mariela.",
    inputSchema: { persona: z.string().describe("nombre o user_id"), desde: fecha.optional(), hasta: fecha.optional() },
  }, async ({ persona, desde, hasta }) => {
    const id = await resolverPersona(supabase, persona);
    if (!id) return error(`No encuentro a ${persona}.`);
    const d = desde ?? lunesDeHoy(), h = hasta ?? sumar(d, 6);
    const { data: decl } = await supabase.from("bitacora").select("fecha, texto, minutos, evidencia_url, pieza:piezas(id_publico, titulo)").eq("perfil_id", id).gte("fecha", d).lte("fecha", h).order("fecha").order("created_at");
    const dias: Record<string, unknown> = {};
    for (let x = d; x <= h; x = sumar(x, 1)) {
      const { data: ev } = await supabase.rpc("evidencia_dia", { p_perfil: id, p_fecha: x });
      dias[x] = { declaro: (decl ?? []).filter((b) => b.fecha === x), evidencia: ev };
    }
    return json({ persona: id, desde: d, hasta: h, dias });
  });

  // -------------------------------------------------------------------------
  // Historias
  // -------------------------------------------------------------------------
  server.registerTool("proponer_historias", {
    description: "Propone el paquete de historias de una semana (lunes). Quedan en estado propuesta hasta que Nazho apruebe.",
    inputSchema: {
      semana: fecha, historias: z.array(z.object({
        dia: z.number().int().min(1).max(7), orden: z.number().int().min(1).default(1),
        serie: z.enum(["te_lo_resumo", "archivo_folklore", "criterio_viernes", "amplificacion", "espontanea"]),
        registro: z.enum(["organico", "producido"]), copy: z.string().optional(), keyword: z.string().optional(),
        pieza_amplificada: z.string().optional().describe("id_publico o uuid"), recurso_slug: z.string().optional(),
      })).min(1),
    },
  }, async ({ semana, historias }) => {
    const { data: com } = await supabase.from("comunidades").select("id").eq("activa", true).order("nombre").limit(1).single();
    const filas = [];
    for (const h of historias) {
      let pieza_amplificada_id: string | null = null;
      if (h.pieza_amplificada) {
        const { data: p } = await supabase.from("piezas").select("id").or(`id_publico.eq.${h.pieza_amplificada},id.eq.${uuidOrNil(h.pieza_amplificada)}`).maybeSingle();
        pieza_amplificada_id = p?.id ?? null;
      }
      let recurso_id: string | null = null;
      if (h.recurso_slug) {
        const { data: r } = await supabase.from("recursos").select("id").eq("slug_go", h.recurso_slug).maybeSingle();
        recurso_id = r?.id ?? null;
      }
      filas.push({ comunidad_id: com?.id, semana, dia: h.dia, orden: h.orden, serie: h.serie, registro: h.registro, copy: h.copy, keyword: h.keyword, pieza_amplificada_id, recurso_id, estado: "propuesta" });
    }
    const { data, error: e } = await supabase.from("historias").insert(filas).select("id, dia, serie");
    if (e) return error(limpiarError(e.message));
    await corrida("proponer_historias", `semana ${semana}: ${data.length} historias en propuesta`, { semana }, perfil);
    return json({ propuestas: data.length, historias: data });
  });

  server.registerTool("aprobar_historias", {
    description: "Aprueba en bloque las historias en propuesta de una semana y crea la tarea «publicar» para la editora por cada una.",
    inputSchema: { semana: fecha },
  }, async ({ semana }) => {
    const { data, error: e } = await supabase.rpc("aprobar_historias", { p_semana: semana });
    return e ? error(limpiarError(e.message)) : json({ aprobadas: data });
  });

  // -------------------------------------------------------------------------
  // Métricas
  // -------------------------------------------------------------------------
  server.registerTool("leer_metricas", {
    description: "Métricas y multiplicador por pieza (pieza_id o id_publico), o de todas las publicadas en un rango. Incluye indicadores por semana si se pide.",
    inputSchema: { pieza: z.string().optional(), desde: fecha.optional(), hasta: fecha.optional(), indicadores: z.boolean().default(false) },
  }, async ({ pieza, desde, hasta, indicadores }) => {
    const salida: Record<string, unknown> = {};
    if (pieza) {
      const { data: p } = await supabase.from("piezas").select("id, id_publico, formato, publicada_en, url").or(`id_publico.eq.${pieza},id.eq.${uuidOrNil(pieza)}`).maybeSingle();
      if (!p) return error(`No existe la pieza ${pieza}.`);
      const [{ data: m }, { data: mult }] = await Promise.all([
        supabase.from("metricas").select("fecha, fuente, views, likes, comentarios, saves, follows, multiplicador, n_mediana").eq("pieza_id", p.id).order("fecha", { ascending: false }),
        supabase.rpc("multiplicador", { p_pieza_id: p.id }),
      ]);
      salida.pieza = p; salida.metricas = m; salida.multiplicador = mult?.[0] ?? null;
    } else {
      const d = desde ?? sumar(lunesDeHoy(), -28), h = hasta ?? sumar(lunesDeHoy(), 7);
      const { data: ps } = await supabase.from("piezas").select("id, id_publico, formato, publicada_en, url").eq("estado", "publicada").gte("publicada_en", d).lt("publicada_en", h).order("publicada_en", { ascending: false });
      const filas = [];
      for (const p of ps ?? []) {
        const { data: mult } = await supabase.rpc("multiplicador", { p_pieza_id: p.id });
        const { data: ult } = await supabase.from("metricas").select("fecha, fuente, views, likes, comentarios, saves, follows").eq("pieza_id", p.id).neq("fuente", "pendiente").order("fecha", { ascending: false }).limit(1).maybeSingle();
        filas.push({ ...p, ultima: ult, multiplicador: mult?.[0] ?? null });
      }
      salida.piezas = filas;
    }
    if (indicadores) {
      const { data } = await supabase.from("indicadores_semana").select("*").order("semana", { ascending: false }).limit(8);
      salida.indicadores = data;
    }
    return json(salida);
  });

  server.registerTool("registrar_metrica_manual", {
    description: "Captura manual (fuente = manual, con autor y fecha): follows/views/saves de una pieza, o views/replies/dms de una historia.",
    inputSchema: {
      pieza: z.string().optional().describe("id_publico o uuid"), historia_id: uuid.optional(),
      campo: z.enum(["views", "likes", "comentarios", "saves", "follows", "replies", "dms"]), valor: z.number().int().min(0), fecha: fecha.optional(),
    },
  }, async ({ pieza, historia_id, campo, valor, fecha: f }) => {
    const dia = f ?? new Date().toISOString().slice(0, 10);
    if (historia_id) {
      if (!["views", "replies", "dms"].includes(campo)) return error("En historias solo views, replies y dms.");
      const { data, error: e } = await supabase.from("historias").update({ [campo]: valor } as TablesUpdate<"historias">).eq("id", historia_id).select("id, dia, serie, views, replies, dms").single();
      return e ? error(limpiarError(e.message)) : json(data);
    }
    if (!pieza) return error("Indica pieza o historia_id.");
    const { data: p } = await supabase.from("piezas").select("id, id_publico").or(`id_publico.eq.${pieza},id.eq.${uuidOrNil(pieza)}`).maybeSingle();
    if (!p) return error(`No existe la pieza ${pieza}.`);
    if (["replies", "dms"].includes(campo)) return error("replies y dms son de historias.");
    const { data, error: e } = await supabase.from("metricas").upsert({ pieza_id: p.id, fecha: dia, fuente: "manual", [campo]: valor, capturado_por: perfil.user_id } as TablesInsert<"metricas">, { onConflict: "pieza_id,fecha,fuente" }).select().single();
    if (e) return error(limpiarError(e.message));
    await corrida("registrar_metrica_manual", `${p.id_publico} ${campo}=${valor} (${dia})`, { pieza_id: p.id }, perfil);
    return json(data);
  });

  // -------------------------------------------------------------------------
  // El Nodo
  // -------------------------------------------------------------------------
  server.registerTool("listar_sistemas", {
    description: "Sistemas definidos (grafos de nodos ia · humano · automatizacion · plataforma) con su versión.",
    inputSchema: {},
  }, async () => {
    const { data, error: e } = await supabase.from("sistemas").select("clave, nombre, proposito, cadencia, nodos, aristas, version, activo").order("orden");
    return e ? error(e.message) : json(data);
  });

  server.registerTool("definir_sistema", {
    description: "Crea o redefine un sistema por clave. nodos: [{clave, nombre, tipo, dueno, disparador, estado_base: agendado|sin_sistema, evidencia: {fuente: corridas|tareas|piezas|historias|indicadores|metricas|recursos|campanas|ninguna, ...filtro}, nota}]. aristas: [{de, a, etiqueta}].",
    inputSchema: {
      clave: z.string().regex(/^[a-z][a-z0-9_]+$/), nombre: z.string(), proposito: z.string().optional(), cadencia: z.string().optional().describe("intervalo Postgres, p. ej. '7 days'"),
      nodos: z.array(z.object({
        clave: z.string(), nombre: z.string(), tipo: z.enum(["ia", "humano", "automatizacion", "plataforma"]),
        dueno: z.string().optional(), disparador: z.string().optional(), estado_base: z.enum(["agendado", "sin_sistema"]).optional(),
        evidencia: z.record(z.string(), z.unknown()).optional(), nota: z.string().optional(),
      })).min(1),
      aristas: z.array(z.object({ de: z.string(), a: z.string(), etiqueta: z.string().optional() })).default([]),
      orden: z.number().int().optional(), activo: z.boolean().optional(),
    },
  }, async (v) => {
    const { data, error: e } = await supabase.rpc("definir_sistema", { payload: v as never });
    return e ? error(limpiarError(e.message)) : json({ clave: data.clave, version: data.version, nodos: (data.nodos as unknown[]).length });
  });

  server.registerTool("estado_semana", {
    description: "La semana en un vistazo: cuota contra realidad y estado de cada nodo de cada sistema (corrio · agendado · sin_sistema · hueco). semana = lunes; por defecto la actual.",
    inputSchema: { semana: fecha.optional() },
  }, async ({ semana }) => {
    const s = semana ?? lunesDeHoy();
    const [{ data: cuota }, { data: sistemas }] = await Promise.all([
      supabase.rpc("cuota_semana", { p_semana: s }),
      supabase.from("sistemas").select("clave, nombre").eq("activo", true).order("orden"),
    ]);
    const nodos: Record<string, unknown> = {};
    for (const x of sistemas ?? []) {
      const { data } = await supabase.rpc("estado_nodos", { p_clave: x.clave, p_semana: s });
      nodos[x.clave] = { nombre: x.nombre, nodos: (data ?? []).map((n) => ({ nodo: n.nodo_clave, estado: n.estado, detalle: n.detalle, hueco: n.hueco_nota })) };
    }
    return json({ semana: s, cuota, sistemas: nodos });
  });

  server.registerTool("declarar_hueco", {
    description: "Declara que un nodo no corrió esta semana y por qué. Lo que no ocurre se escribe; nunca se estima.",
    inputSchema: { sistema: z.string(), nodo: z.string(), nota: z.string().min(3), semana: fecha.optional() },
  }, async ({ sistema, nodo, nota, semana }) => {
    const { data, error: e } = await supabase.rpc("declarar_hueco", { p_semana: semana ?? lunesDeHoy(), p_sistema: sistema, p_nodo: nodo, p_nota: nota });
    return e ? error(limpiarError(e.message)) : json(data);
  });

  return server;
}

async function resolverPersona(supabase: Cliente, quien: string): Promise<string | null> {
  if (/^[0-9a-f-]{36}$/.test(quien)) return quien;
  const { data } = await supabase.from("perfiles").select("user_id").ilike("nombre", `${quien}%`).limit(1).maybeSingle();
  return data?.user_id ?? null;
}

function uuidOrNil(x: string) {
  return /^[0-9a-f-]{36}$/.test(x) ? x : "00000000-0000-0000-0000-000000000000";
}

function sumar(fechaISO: string, dias: number) {
  const d = new Date(fechaISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
