import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 24, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...props,
  };
}

export const ArrowRightIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const ArrowUpIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);
export const CartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 4h2.2l2.1 10.2a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 1.9-1.5L20.5 8H6.1" />
    <circle cx="9.5" cy="20" r="1.4" />
    <circle cx="17" cy="20" r="1.4" />
  </svg>
);
export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const MinusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
);
export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V4.8A.8.8 0 0 1 9.8 4h4.4a.8.8 0 0 1 .8.8V7M6.5 7l.9 12.2a1.8 1.8 0 0 0 1.8 1.8h5.6a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />
  </svg>
);
export const PhoneIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5.2 3.5h3l1.6 4.2-2.1 1.4a11 11 0 0 0 7.2 7.2l1.4-2.1 4.2 1.6v3A2.2 2.2 0 0 1 18.3 21 15.5 15.5 0 0 1 3 5.7a2.2 2.2 0 0 1 2.2-2.2Z" />
  </svg>
);
export const MailIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);
export const PinIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);
export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const MenuIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 8h16M4 16h10" />
  </svg>
);
export const GlobeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);
export const ShareIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </svg>
);

/** WhatsApp glyph (filled). */
export const WhatsAppIcon = ({ size = 24, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable={false} {...props}>
    <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.98L2 22l5.17-1.5A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.07.9.92-3-.2-.31a8.2 8.2 0 1 1 6.85 3.74Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.72-1.33.08-.16.04-.3-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.41-.56-.42h-.47a.9.9 0 0 0-.66.31 2.8 2.8 0 0 0-.86 2.07 4.8 4.8 0 0 0 1 2.56 11 11 0 0 0 4.22 3.73c1.57.68 2.19.74 2.98.62.48-.07 1.46-.6 1.67-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z" />
  </svg>
);

const socialPaths: Record<string, string> = {
  facebook:
    "M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.87.25-1.46 1.5-1.46h1.6V4.46A21 21 0 0 0 14.3 4.3c-2.3 0-3.8 1.4-3.8 3.95v2.25H8v3h2.5V21h3Z",
  instagram:
    "M12 7.4A4.6 4.6 0 1 0 12 16.6 4.6 4.6 0 0 0 12 7.4Zm0 7.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm4.8-8.85a1.07 1.07 0 1 1 0 2.14 1.07 1.07 0 0 1 0-2.14ZM21 8.3c-.06-1.4-.37-2.65-1.4-3.66C18.6 3.6 17.34 3.3 15.93 3.23 14.49 3.15 9.5 3.15 8.07 3.23 6.67 3.3 5.42 3.62 4.4 4.63S3.06 6.9 3 8.3c-.08 1.45-.08 6.44 0 7.88.06 1.41.38 2.66 1.4 3.67 1.02 1.01 2.26 1.33 3.67 1.4 1.44.08 6.43.08 7.87 0 1.41-.07 2.66-.39 3.67-1.4 1.01-1.01 1.33-2.26 1.4-3.67.08-1.44.08-6.43 0-7.88Z",
  tiktok:
    "M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.27 0 .52.04.77.12V9.76a5.7 5.7 0 1 0 4.93 5.64V9.1a7.3 7.3 0 0 0 4.26 1.36V7.37s-1.85.09-3.2-1.55Z",
  youtube:
    "M21.6 7.2a2.5 2.5 0 0 0-1.77-1.77C18.27 5 12 5 12 5s-6.27 0-7.83.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.77 1.77C5.73 19 12 19 12 19s6.27 0 7.83-.43a2.5 2.5 0 0 0 1.77-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z",
  x: "M13.3 10.6 19.95 3h-1.58l-5.77 6.6L7.98 3H3l6.97 10 -6.97 8h1.58l6.1-6.98L15.98 21H21l-7.7-10.4Zm-2.16 2.47-.7-1-5.63-7.9h2.43l4.54 6.37.7 1 5.9 8.27h-2.43l-4.81-6.74Z",
  linkedin:
    "M6.94 5.5a2.06 2.06 0 1 1-4.12 0 2.06 2.06 0 0 1 4.12 0ZM3.1 8.75h3.56V21H3.1V8.75Zm6.23 0h3.41v1.68h.05c.48-.9 1.64-1.86 3.37-1.86 3.6 0 4.27 2.37 4.27 5.46V21h-3.56v-5.5c0-1.31-.03-3-1.86-3-1.85 0-2.14 1.44-2.14 2.93V21H9.33V8.75Z",
  telegram:
    "M9.78 18.65l.28-4.23 7.68-6.92c.34-.3-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.27-.89-.86.2-1.27l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.9-.73 1.12-1.48.7l-4.08-3.01-1.97 1.9c-.23.23-.42.42-.83.42Z",
};

export function SocialIcon({ network, size = 22 }: { network: string; size?: number }) {
  const d = socialPaths[network];
  if (!d) return <ShareIcon size={size} />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable={false}>
      <path d={d} />
    </svg>
  );
}

/** Mushroom (ikizinu), the base ingredient of Krumbz. */
export const MushroomIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 12c0-4.4 4-8 9-8s9 3.6 9 8z" />
    <path d="M9.5 12v5.5a2.5 2.5 0 0 0 5 0V12" />
    <circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);
