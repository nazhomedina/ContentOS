export type Rol = "owner" | "editor" | "viewer";

/** Pantalla de inicio por rol. */
export function inicioPorRol(rol: Rol): string {
  switch (rol) {
    case "owner":
      return "/inicio";
    case "editor":
      return "/cola";
    case "viewer":
      return "/calendario";
  }
}

/** Prefijos de ruta que cada rol puede abrir. owner: todo. */
const RUTAS: Record<Rol, string[]> = {
  owner: ["/"],
  editor: ["/cola", "/piezas", "/historias", "/reels", "/carruseles", "/articulos", "/newsletter", "/formatos", "/calendario"],
  viewer: ["/calendario", "/piezas", "/historias"],
};

export function rutaPermitida(rol: Rol, pathname: string): boolean {
  return RUTAS[rol].some((p) => p === "/" || pathname === p || pathname.startsWith(p + "/"));
}

export const NOMBRE_ROL: Record<Rol, string> = { owner: "Dueño", editor: "Editora", viewer: "Lectura" };
