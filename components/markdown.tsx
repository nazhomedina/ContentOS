import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function Markdown({ texto, className }: { texto: string | null | undefined; className?: string }) {
  if (!texto?.trim()) return <p className="text-sm text-muted-foreground">Vacío.</p>;
  return (
    <div className={cn("prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-a:text-primary", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{texto}</ReactMarkdown>
    </div>
  );
}
