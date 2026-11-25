import Image from "next/image";
import mark from "../../../public/brand/rundinova-mark.png";
import markWhite from "../../../public/brand/rundinova-mark-white.png";

/**
 * Rundinova Studio lockup: the RundiNova Tech « RN » mark (transparent PNG cut from the owner's logo,
 * scripts/brand-rundinova.mjs) + « RundiNova » in the wordmark style, « Studio » in royal blue.
 */
export function Wordmark({ tone = "dark", compact = false }: { tone?: "dark" | "light"; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image
        src={tone === "light" ? markWhite : mark}
        alt=""
        aria-hidden
        sizes="64px"
        className={compact ? "h-7 w-auto sm:h-8" : "h-10 w-auto"}
        loading="eager"
      />
      <span className={`whitespace-nowrap font-bold tracking-tight ${compact ? "text-[1.08rem] sm:text-[1.18rem]" : "text-[1.45rem]"} ${tone === "light" ? "text-white" : "text-black"}`}>
        RundiNova <span className={`${compact ? "hidden min-[420px]:inline " : ""}font-medium ${tone === "light" ? "text-rn-cyan" : "text-rn-blue"}`}>Studio</span>
      </span>
    </span>
  );
}
