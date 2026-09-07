import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { inicioPorRol, rutaPermitida, type Rol } from "@/lib/dominio/roles";

const PUBLICAS = ["/login", "/auth"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getUser valida el JWT contra Supabase; getSession no.
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const esPublica = PUBLICAS.some((p) => pathname.startsWith(p));

  if (!user) {
    if (esPublica) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("volver", pathname);
    return NextResponse.redirect(url);
  }

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("user_id", user.id).maybeSingle();
  const rol = (perfil?.rol ?? null) as Rol | null;

  if (!rol) {
    // Usuario de auth sin perfil: no debería pasar (la lista blanca lo impide), pero no dejamos entrar.
    if (pathname === "/login") return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "sin-perfil");
    return NextResponse.redirect(url);
  }

  if (pathname === "/" || pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = inicioPorRol(rol);
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!esPublica && !rutaPermitida(rol, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = inicioPorRol(rol);
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/mcp|api/hooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"],
};
