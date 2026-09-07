import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Entrada por token_hash (sin PKCE). La usan los enlaces generados con
 * scripts/enlace-acceso.mjs y, si se cambia la plantilla de correo de Supabase a
 * {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink, también el correo.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "magiclink") as EmailOtpType;
  const volver = searchParams.get("volver") ?? "/";
  const destino = volver.startsWith("/") ? volver : "/";

  if (token_hash) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
  }
  return NextResponse.redirect(`${origin}/login?error=enlace`);
}
