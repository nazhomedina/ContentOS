"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import {
  Bold, Code, Code2, Heading1, Heading2, Heading3, Italic, Link2, List, ListOrdered, Maximize2, Minimize2,
  Minus, Pilcrow, Quote, Redo2, Strikethrough, Table as TablaIcono, Undo2, FileCode,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Editor visual de markdown (Tiptap): se escribe viendo negritas, títulos, listas, citas y tablas,
 * y lo que se guarda sigue siendo markdown, igual que lo que escribe Claude por MCP.
 * Atajos: **texto**, # título, - lista, 1. lista, > cita, --- separador; ⌘B, ⌘I, ⌘Z; ⌘S o ⌘Enter guardan.
 * «Markdown» cambia a la fuente cruda para lo que el editor visual no cubre.
 */
export function EditorMarkdown({
  inicial, onCambio, onGuardar, placeholder = "Escribe aquí. # para un título, - para una lista, ** para negritas…", borradorClave,
}: {
  inicial: string;
  onCambio: (markdown: string, cambiado: boolean) => void;
  onGuardar: () => void;
  placeholder?: string;
  /** Si se da, el texto sin guardar se respalda en este navegador para no perderlo. */
  borradorClave?: string;
}) {
  const [fuente, setFuente] = useState(false);
  const [crudo, setCrudo] = useState(inicial);
  const [amplio, setAmplio] = useState(false);
  const base = useRef<string | null>(null);
  const guardarRef = useRef(onGuardar);
  guardarRef.current = onGuardar;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ underline: false, link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } } }),
      Markdown.configure({ markedOptions: { gfm: true, breaks: false } }),
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder }),
    ],
    content: inicial,
    contentType: "markdown",
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base max-w-none dark:prose-invert focus:outline-none min-h-[18rem] px-4 py-3 prose-headings:font-bold prose-a:text-primary prose-table:text-sm",
      },
      handleKeyDown: (_view, e) => {
        if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "Enter")) { e.preventDefault(); guardarRef.current(); return true; }
        return false;
      },
    },
    onCreate: ({ editor }) => { base.current = editor.getMarkdown(); },
    onUpdate: ({ editor }) => {
      const md = editor.getMarkdown();
      onCambio(md, md !== base.current);
      if (borradorClave) { try { localStorage.setItem(borradorClave, md); } catch { /* sin almacenamiento: no pasa nada */ } }
    },
  });

  // Pasar de la fuente cruda al editor visual y de regreso.
  function alternarFuente() {
    if (!editor) return;
    if (fuente) {
      editor.commands.setContent(crudo, { contentType: "markdown", emitUpdate: true });
      setFuente(false);
    } else {
      setCrudo(editor.getMarkdown());
      setFuente(true);
    }
  }

  useEffect(() => {
    if (!amplio) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setAmplio(false); } };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [amplio]);

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-lg border bg-background", amplio && "fixed inset-3 z-[60] shadow-2xl sm:inset-8")}>
      <BarraHerramientas editor={editor} fuente={fuente} amplio={amplio} onFuente={alternarFuente} onAmplio={() => setAmplio((v) => !v)} />
      <div className={cn("min-h-0 flex-1 overflow-y-auto", !amplio && "max-h-[70vh]")}>
        {fuente ? (
          <Textarea
            aria-label="Fuente markdown"
            value={crudo}
            onChange={(e) => { setCrudo(e.target.value); onCambio(e.target.value, e.target.value !== base.current); }}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "Enter")) { e.preventDefault(); guardarRef.current(); } }}
            className="min-h-[18rem] w-full resize-none rounded-none border-0 font-mono text-[13px] leading-relaxed focus-visible:ring-0"
            rows={Math.min(60, Math.max(14, crudo.split("\n").length + 2))}
          />
        ) : (
          <EditorContent editor={editor} className={cn(amplio && "mx-auto max-w-3xl")} />
        )}
      </div>
      <Pie editor={editor} fuente={fuente} crudo={crudo} />
    </div>
  );
}

function BarraHerramientas({ editor, fuente, amplio, onFuente, onAmplio }: { editor: Editor | null; fuente: boolean; amplio: boolean; onFuente: () => void; onAmplio: () => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => e ? {
      p: e.isActive("paragraph"), h1: e.isActive("heading", { level: 1 }), h2: e.isActive("heading", { level: 2 }), h3: e.isActive("heading", { level: 3 }),
      b: e.isActive("bold"), i: e.isActive("italic"), s: e.isActive("strike"), code: e.isActive("code"), link: e.isActive("link"),
      ul: e.isActive("bulletList"), ol: e.isActive("orderedList"), quote: e.isActive("blockquote"), pre: e.isActive("codeBlock"), tabla: e.isActive("table"),
      undo: e.can().undo(), redo: e.can().redo(),
    } : null,
  });
  if (!editor) return <div className="h-10 border-b bg-muted/40" />;
  const c = () => editor.chain().focus();
  const off = fuente;

  function liga() {
    if (!editor) return;
    const previa = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Liga (vacío para quitarla)", previa ?? "https://");
    if (url === null) return;
    if (url.trim() === "" || url === "https://") c().extendMarkRange("link").unsetLink().run();
    else c().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  return (
    <div role="toolbar" aria-label="Formato" className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-1.5 py-1">
      <Boton t="Párrafo" on={s?.p} off={off} f={() => c().setParagraph().run()}><Pilcrow /></Boton>
      <Boton t="Título 1" on={s?.h1} off={off} f={() => c().toggleHeading({ level: 1 }).run()}><Heading1 /></Boton>
      <Boton t="Título 2" on={s?.h2} off={off} f={() => c().toggleHeading({ level: 2 }).run()}><Heading2 /></Boton>
      <Boton t="Título 3" on={s?.h3} off={off} f={() => c().toggleHeading({ level: 3 }).run()}><Heading3 /></Boton>
      <Sep />
      <Boton t="Negritas (⌘B)" on={s?.b} off={off} f={() => c().toggleBold().run()}><Bold /></Boton>
      <Boton t="Cursivas (⌘I)" on={s?.i} off={off} f={() => c().toggleItalic().run()}><Italic /></Boton>
      <Boton t="Tachado" on={s?.s} off={off} f={() => c().toggleStrike().run()}><Strikethrough /></Boton>
      <Boton t="Código" on={s?.code} off={off} f={() => c().toggleCode().run()}><Code /></Boton>
      <Boton t="Liga" on={s?.link} off={off} f={liga}><Link2 /></Boton>
      <Sep />
      <Boton t="Lista" on={s?.ul} off={off} f={() => c().toggleBulletList().run()}><List /></Boton>
      <Boton t="Lista numerada" on={s?.ol} off={off} f={() => c().toggleOrderedList().run()}><ListOrdered /></Boton>
      <Boton t="Cita" on={s?.quote} off={off} f={() => c().toggleBlockquote().run()}><Quote /></Boton>
      <Boton t="Bloque de código" on={s?.pre} off={off} f={() => c().toggleCodeBlock().run()}><Code2 /></Boton>
      <Boton t="Separador" off={off} f={() => c().setHorizontalRule().run()}><Minus /></Boton>
      <Boton t={s?.tabla ? "Quitar tabla" : "Tabla"} on={s?.tabla} off={off} f={() => (s?.tabla ? c().deleteTable().run() : c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}><TablaIcono /></Boton>
      <Sep />
      <Boton t="Deshacer (⌘Z)" off={off || !s?.undo} f={() => c().undo().run()}><Undo2 /></Boton>
      <Boton t="Rehacer (⇧⌘Z)" off={off || !s?.redo} f={() => c().redo().run()}><Redo2 /></Boton>
      <span className="ml-auto flex items-center gap-0.5">
        <Boton t={fuente ? "Volver al editor visual" : "Ver y editar el markdown"} on={fuente} f={onFuente}><FileCode /><span className="hidden text-xs 2xl:inline">Markdown</span></Boton>
        <Boton t={amplio ? "Salir de pantalla amplia (Esc)" : "Pantalla amplia"} on={amplio} f={onAmplio}>{amplio ? <Minimize2 /> : <Maximize2 />}</Boton>
      </span>
    </div>
  );
}

function Boton({ t, on, off, f, children }: { t: string; on?: boolean; off?: boolean; f: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={t}
      aria-label={t}
      aria-pressed={on ?? undefined}
      disabled={off}
      onMouseDown={(e) => e.preventDefault()}
      onClick={f}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md px-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-4",
        on && "bg-background text-foreground shadow-sm",
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-border" />;
}

function Pie({ editor, fuente, crudo }: { editor: Editor | null; fuente: boolean; crudo: string }) {
  const n = useEditorState({ editor, selector: ({ editor: e }) => (e ? e.getText({ blockSeparator: " " }).trim().split(/\s+/).filter(Boolean).length : 0) });
  const palabras = fuente ? crudo.trim().split(/\s+/).filter(Boolean).length : n ?? 0;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
      <span className="tabular-nums">{palabras} palabras · ~{Math.max(1, Math.round(palabras / 150))} min en voz alta</span>
      <span>**negritas** · # título · - lista · &gt; cita · ⌘S guarda</span>
    </div>
  );
}
