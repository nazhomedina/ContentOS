import { NextResponse, type NextRequest } from "next/server";
import { JOBS } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Vercel Cron llama aquí con `Authorization: Bearer CRON_SECRET`. Cada job deja su corrida; la respuesta es el resumen. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ job: string }> }) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { job } = await params;
  const def = JOBS[job];
  if (!def) return NextResponse.json({ error: `No existe el job ${job}.` }, { status: 404 });
  const r = await def.correr();
  return NextResponse.json(r, { status: r.estado === "error" ? 500 : 200 });
}
