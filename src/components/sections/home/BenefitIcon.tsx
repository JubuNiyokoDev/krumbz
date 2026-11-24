/** Hand-drawn style icons for the benefits (decorative). */
export function BenefitIcon({ id, className = "" }: { id: string; className?: string }) {
  const common = {
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
    focusable: false,
  };
  switch (id) {
    // Generic icons for the other shops (ids: shoe, star, heart, leaf, truck).
    case "shoe":
      return (
        <svg {...common}>
          <path d="M6 30V18h9c1 4 4 6 8 7l13 3c4 1 6 3 6 6v2H6Z" />
          <path d="M6 36h36M17 22l3-2M20 25l3-2" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path d="m24 7 5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1Z" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common}>
          <path d="M24 39S8 30 8 18a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 12-16 21-16 21Z" />
        </svg>
      );
    case "leaf":
      return (
        <svg {...common}>
          <path d="M10 38C10 20 22 10 40 9c0 18-10 29-27 29" />
          <path d="M10 38 28 20" />
        </svg>
      );
    case "truck":
      return (
        <svg {...common}>
          <path d="M5 13h22v20H5ZM27 20h8l7 7v6H27" />
          <circle cx="13" cy="35" r="3.5" />
          <circle cx="34" cy="35" r="3.5" />
        </svg>
      );
    case "crispy":
      return (
        <svg {...common}>
          <circle cx="22" cy="24" r="13" />
          <path d="M31 15 38 9M34 22h8M30 32l6 5" />
          <circle cx="18" cy="20" r="1.2" fill="currentColor" />
          <circle cx="25" cy="27" r="1.2" fill="currentColor" />
          <circle cx="17" cy="29" r="1.2" fill="currentColor" />
        </svg>
      );
    case "mushroom":
      return (
        <svg {...common}>
          <path d="M8 24a16 14 0 0 1 32 0Z" />
          <path d="M19 24v10a5 5 0 0 0 10 0V24" />
          <circle cx="17" cy="17" r="2" fill="currentColor" />
          <circle cx="27" cy="14" r="1.6" fill="currentColor" />
          <circle cx="32" cy="20" r="1.4" fill="currentColor" />
        </svg>
      );
    case "burundi":
      return (
        <svg {...common}>
          <path d="M4 36c6-10 10-14 15-14s7 5 11 5 8-7 14-7" />
          <path d="M4 42c8-5 14-8 20-8s12 3 20 6" />
          <circle cx="34" cy="11" r="4.5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="16" cy="15" r="5" />
          <circle cx="32" cy="17" r="4" />
          <path d="M6 38c0-7 4.5-12 10-12s10 5 10 12" />
          <path d="M26 30c1.5-2.5 3.7-4 6-4 4.5 0 8 4 8 10" />
        </svg>
      );
  }
}
