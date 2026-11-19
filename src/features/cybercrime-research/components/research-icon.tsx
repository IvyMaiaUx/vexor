import type { SVGProps } from "react";

export type ResearchIconName =
  | "investigation"
  | "underground"
  | "library"
  | "cases"
  | "discussions"
  | "labs"
  | "pillars"
  | "spaces"
  | "categories"
  | "shield"
  | "featured"
  | "lock"
  | "block"
  | "info"
  | "link"
  | "search"
  | "empty"
  | "malware"
  | "phishing"
  | "breach"
  | "darkweb"
  | "financial"
  | "botnet"
  | "identity"
  | "law"
  | "apt";

interface ResearchIconProps extends SVGProps<SVGSVGElement> {
  name: string;
}

const BASE_PROPS: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

/**
 * Renders clean, monochrome SVG icons for the Cybercrime Research module,
 * replacing graphical emojis with technical iconography.
 */
export function ResearchIcon({ name, className = "h-5 w-5", ...rest }: ResearchIconProps) {
  const props = { ...BASE_PROPS, className, ...rest };

  switch (name) {
    case "investigation":
    case "search":
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
          <path d="M11 8v6M8 11h6" />
        </svg>
      );
    case "underground":
    case "darkweb":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a13 13 0 0 1 0 18 13 13 0 0 1 0-18Z" />
        </svg>
      );
    case "library":
    case "featured":
      return (
        <svg {...props}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22.5z" />
          <path d="M4 5.5V20" />
          <path d="M8 7h8M8 11h6" />
        </svg>
      );
    case "cases":
      return (
        <svg {...props}>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M8 13h8" />
        </svg>
      );
    case "discussions":
      return (
        <svg {...props}>
          <path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" />
          <path d="M8 11h8M8 14h5" />
        </svg>
      );
    case "labs":
      return (
        <svg {...props}>
          <path d="M9 3h6M10 3v5l-4.5 7.5A2 2 0 0 0 7.2 18.5h9.6a2 2 0 0 0 1.7-3L14 8V3" />
          <path d="M7.5 14h9" />
        </svg>
      );
    case "pillars":
      return (
        <svg {...props}>
          <path d="M3 20h18M4 10h16M12 3 3 8h18z" />
          <path d="M6 10v10M10 10v10M14 10v10M18 10v10" />
        </svg>
      );
    case "spaces":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "categories":
      return (
        <svg {...props}>
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      );
    case "shield":
      return (
        <svg {...props}>
          <path d="M12 3 4 6.5V12c0 5 3.4 8.6 8 9.8 4.6-1.2 8-4.8 8-9.8V6.5z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "lock":
      return (
        <svg {...props}>
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      );
    case "block":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="m6.5 6.5 11 11" />
        </svg>
      );
    case "info":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      );
    case "link":
      return (
        <svg {...props}>
          <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.5 1.5" />
          <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.5-1.5" />
        </svg>
      );
    case "empty":
      return (
        <svg {...props}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M4 13h4l2 2h4l2-2h4" />
        </svg>
      );
    case "malware":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v5M12 16v5M3 12h5M16 12h5M5.6 5.6l3.5 3.5M14.9 14.9l3.5 3.5M18.4 5.6l-3.5 3.5M9.1 14.9l-3.5 3.5" />
        </svg>
      );
    case "phishing":
      return (
        <svg {...props}>
          <path d="M12 3v11a4 4 0 0 1-8 0v-1" />
          <circle cx="12" cy="5" r="1.5" />
          <path d="m16 9 4 4-4 4" />
        </svg>
      );
    case "breach":
      return (
        <svg {...props}>
          <ellipse cx="12" cy="6" rx="7" ry="3" />
          <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
          <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
        </svg>
      );
    case "financial":
      return (
        <svg {...props}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18M7 14h4" />
        </svg>
      );
    case "botnet":
      return (
        <svg {...props}>
          <circle cx="12" cy="5" r="2" />
          <circle cx="5" cy="18" r="2" />
          <circle cx="19" cy="18" r="2" />
          <path d="M12 7v4m0 0-5.5 5.2M12 11l5.5 5.2" />
        </svg>
      );
    case "identity":
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="11" r="2" />
          <path d="M6.5 16a3.5 3.5 0 0 1 5 0M14 10h4M14 14h3" />
        </svg>
      );
    case "law":
      return (
        <svg {...props}>
          <path d="M12 4v16M7 20h10M5 8h14" />
          <path d="m6 8-2.5 5h5zm12 0-2.5 5h5z" />
        </svg>
      );
    case "apt":
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      );
  }
}
