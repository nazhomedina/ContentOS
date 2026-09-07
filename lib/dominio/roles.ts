export type Rol = "owner" | "editor" | "viewer";

/** Pantalla de inicio por rol (handoff §7 y diseño §6). */
export function inicioPorRol(rol: Rol): string {
  switch (rol) {
    case "owner":
      return "/hoy";
    case "editor":
      return "/cola";
    case "viewer":
      return "/semana";
  }
}

/** Prefijos de ruta que cada rol puede abrir. owner: todo. */
const RUTAS: Record<Rol, string[]> = {
  owner: ["/"],
  editor: ["/cola", "/piezas", "/historias"],
  viewer: ["/semana", "/maquina", "/embudo", "/tablero", "/piezas", "/historias"],
};

export function rutaPermitida(rol: Rol, pathname: string): boolean {
  return RUTAS[rol].some((p) => p === "/" || pathname === p || pathname.startsWith(p + "/"));
}

export const NOMBRE_ROL: Record<Rol, string> = { owner: "Dueño", editor: "Editora", viewer: "Lectura" };
