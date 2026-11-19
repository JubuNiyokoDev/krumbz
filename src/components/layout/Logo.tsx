import { Biscuit } from "@/components/ui/Biscuit";

/** Typographic « Krumbz » wordmark with the biscuit mark. */
export function Logo({ name, tone = "dark", className = "" }: { name: string; tone?: "dark" | "light"; className?: string }) {
  return (
    <span className={`group/logo inline-flex items-center gap-2 ${className}`}>
      <Biscuit className="h-9 w-9 shrink-0 transition-transform duration-700 ease-out-back group-hover/logo:rotate-[35deg] group-hover/logo:scale-110 lg:h-10 lg:w-10" />
      <span className={`font-display text-[1.7rem] font-bold leading-none tracking-tight lg:text-[1.9rem] ${tone === "light" ? "text-cream" : "text-navy"}`}>
        {name.slice(0, -1)}
        <span className={tone === "light" ? "text-gold-light" : "text-rust"}>{name.slice(-1)}</span>
      </span>
    </span>
  );
}
