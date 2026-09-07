import { NextResponse, type NextRequest } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { hoyISO, sumarDias } from "@/lib/dominio/tiempo";

/**
 * Database Webhook de Supabase sobre storage.objects (INSERT).
 * Cuando llega un RAW a assets/piezas/{pieza_id}/raw/*, crea la tarea «editar»
 * para el responsable de la pieza (o el primer editor) si no hay una abierta.
 * Configurar en el dashboard: Database → Webhooks → tabla storage.objects, evento INSERT,
 * header `x-hooks-secret: <HOOKS_SECRET>`.
 */
export async function POST(request: NextRequest) {
  if (request.headers.get("x-hooks-secret") !== process.env.HOOKS_SECRET) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as { type?: string; record?: { name?: string; bucket_id?: string } } | null;
  const nombre = body?.record?.name ?? "";
  const m = /^piezas\/([0-9a-f-]{36})\/raw\//.exec(nombre);
  if (body?.type !== "INSERT" || body.record?.bucket_id !== "assets" || !m) {
    return NextResponse.json({ ignorado: true });
  }
  const piezaId = m[1];
  const admin = crearClienteAdmin();

  const { data: pieza } = await admin.from("piezas").select("id, id_publico, responsable_id").eq("id", piezaId).maybeSingle();
  if (!pieza) return NextResponse.json({ ignorado: "pieza inexistente" });

  const { count } = await admin.from("tareas").select("id", { count: "exact", head: true })
    .eq("pieza_id", piezaId).eq("tipo", "editar").neq("estado", "hecha");
  if ((count ?? 0) > 0) return NextResponse.json({ ignorado: "ya hay tarea editar" });

  let asignado = pieza.responsable_id;
  if (!asignado) {
    const { data: editor } = await admin.from("perfiles").select("user_id").eq("rol", "editor").order("created_at").limit(1).maybeSingle();
    asignado = editor?.user_id ?? null;
  }
  const { data: tarea, error } = await admin.from("tareas").insert({
    pieza_id: piezaId, tipo: "editar", asignado_a: asignado, vence: sumarDias(hoyISO(), 2),
    checklist: [{ texto: "Edición", hecho: false }, { texto: "Portada", hecho: false }, { texto: "Caption", hecho: false }],
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.rpc("registrar_corrida", {
    p_sistema: "hook_storage_raw", p_estado: "ok",
    p_resumen: `RAW de ${pieza.id_publico} → tarea editar`, p_payload: { pieza_id: piezaId, tarea_id: tarea.id, archivo: nombre },
  });
  return NextResponse.json({ ok: true, tarea_id: tarea.id });
}
