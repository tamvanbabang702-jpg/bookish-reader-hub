import { useRef, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Bold, Italic, Heading2, List, Quote as QuoteIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- mini rich text renderer (safe: builds React nodes, no innerHTML) ----------

interface Styled {
  bold?: boolean;
  italic?: boolean;
}

function parseInline(text: string, style: Styled, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // split on **bold** and *italic*
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}b${i}`} className="font-semibold">
          {parseInline(token.slice(2, -2), { ...style, bold: true }, `${keyPrefix}b${i}`)}
        </strong>,
      );
    } else {
      nodes.push(
        <em key={`${keyPrefix}i${i}`}>{token.slice(1, -1)}</em>,
      );
    }
    last = m.index + token.length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function RichContent({ text, className }: { text: string; className?: string }) {
  if (!text?.trim()) return null;
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let list: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (list.length) {
      out.push(
        <ul key={`ul${listKey}`} className="my-2 ml-5 list-disc space-y-1 marker:text-gold-deep">
          {list.map((li, j) => (
            <li key={j}>{parseInline(li, {}, `ul${listKey}-${j}`)}</li>
          ))}
        </ul>,
      );
      list = [];
      listKey++;
    }
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (line.startsWith("- ") || line.startsWith("* ")) {
      list.push(line.slice(2));
      return;
    }
    flushList();
    if (!line.trim()) return;
    if (line.startsWith("## ")) {
      out.push(
        <h4 key={idx} className="font-display text-base font-semibold mt-3 mb-1">
          {parseInline(line.slice(3), {}, `h${idx}`)}
        </h4>,
      );
    } else if (line.startsWith("> ")) {
      out.push(
        <blockquote
          key={idx}
          className="my-2 border-l-2 border-gold bg-muted/60 px-3 py-2 rounded-r-lg text-muted-foreground"
        >
          {parseInline(line.slice(2), {}, `q${idx}`)}
        </blockquote>,
      );
    } else if (line.startsWith("# ")) {
      out.push(
        <h3 key={idx} className="font-display text-lg font-semibold mt-3 mb-1">
          {parseInline(line.slice(2), {}, `hh${idx}`)}
        </h3>,
      );
    } else {
      out.push(<p key={idx} className="my-1">{parseInline(line, {}, `p${idx}`)}</p>);
    }
  });
  flushList();

  return <div className={cn("text-foreground/90", className)}>{out}</div>;
}

// ---------- editor ----------

interface RichEditorProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}

function wrapSelection(el: HTMLTextAreaElement, before: string, after: string, placeholder: string) {
  const { selectionStart: start, selectionEnd: end, value } = el;
  const selected = value.slice(start, end) || placeholder;
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  return { next, caret: start + before.length + selected.length + after.length };
}

export function RichEditor({ value, onChange, placeholder, rows = 6, className, ...rest }: RichEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const apply = (before: string, after: string, ph: string) => {
    const el = ref.current;
    if (!el) {
      onChange(value + before + ph + after);
      return;
    }
    const { next, caret } = wrapSelection(el, before, after, ph);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const tools = [
    { icon: Heading2, label: "Heading", run: () => apply("\n## ", "", "Heading") },
    { icon: Bold, label: "Bold", run: () => apply("**", "**", "bold text") },
    { icon: Italic, label: "Italic", run: () => apply("*", "*", "italic text") },
    { icon: List, label: "List", run: () => apply("\n- ", "", "list item") },
    { icon: QuoteIcon, label: "Quote", run: () => apply("\n> ", "", "quoted passage") },
  ];

  return (
    <div className="rounded-xl border border-input bg-card overflow-hidden focus-within:ring-2 focus-within:ring-ring/40">
      <div className="flex gap-1 border-b border-border/70 bg-muted/50 px-2 py-1.5">
        {tools.map((t) => (
          <button
            key={t.label}
            type="button"
            aria-label={t.label}
            title={t.label}
            onClick={t.run}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <t.icon className="h-4 w-4" />
          </button>
        ))}
        <span className="ml-auto self-center pr-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Markdown-lite
        </span>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          "w-full resize-y bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70",
          className,
        )}
        {...rest}
      />
    </div>
  );
}
