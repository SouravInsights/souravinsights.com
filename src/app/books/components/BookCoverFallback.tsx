import React from "react";

interface BookCoverFallbackProps {
  title: string;
  author?: string;
}

export const BookCoverFallback: React.FC<BookCoverFallbackProps> = ({
  title,
  author,
}) => {
  // Deterministic hash from string
  const hash = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = str.charCodeAt(i) + ((h << 5) - h);
    }
    return h;
  };

  const h = hash(title);

  // Curated palettes — each is [background, accent, text, spineAccent]
  const palettes = [
    ["#1a1a2e", "#e2c275", "#f0e6d3", "#c9a84c"], // midnight & gold
    ["#2c3e50", "#e74c3c", "#ecf0f1", "#c0392b"], // navy & vermillion
    ["#0d1b2a", "#48cae4", "#caf0f8", "#0096c7"], // deep sea & cyan
    ["#3d0814", "#f4a261", "#fefae0", "#e76f51"], // oxblood & amber
    ["#1b2d1b", "#a7c957", "#f2f3ee", "#6a994e"], // forest & sage
    ["#2b2d42", "#ef233c", "#edf2f4", "#d90429"], // charcoal & red
    ["#0a0908", "#f8f9fa", "#e8e8e4", "#d3d3cd"], // black & white
    ["#3a0ca3", "#f72585", "#f8edeb", "#b5179e"], // indigo & magenta
    ["#1d3557", "#f1faee", "#a8dadc", "#457b9d"], // french navy & frost
    ["#352208", "#d4a373", "#fefae0", "#bc6c25"], // espresso & tan
    ["#0b090a", "#ba181b", "#f5f3f4", "#660708"], // noir & crimson
    ["#1b263b", "#778da9", "#e0e1dd", "#415a77"], // steel blue
  ];

  const palette = palettes[Math.abs(h) % palettes.length];
  const [bg, accent, text, spineAccent] = palette;

  // Pick a decorative pattern style based on hash
  const patternStyle = Math.abs(h >> 4) % 5;

  // Generate SVG pattern
  const renderPattern = () => {
    const patternId = `pat-${Math.abs(h)}`;

    switch (patternStyle) {
      case 0: // Diamond lattice
        return (
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.06]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id={patternId}
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="24" height="24" fill="none" />
                <rect x="0" y="0" width="1" height="24" fill={text} />
                <rect x="0" y="0" width="24" height="1" fill={text} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${patternId})`} />
          </svg>
        );
      case 1: // Concentric circles
        return (
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.05]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id={patternId}
                width="60"
                height="60"
                patternUnits="userSpaceOnUse"
              >
                <circle
                  cx="30"
                  cy="30"
                  r="28"
                  fill="none"
                  stroke={text}
                  strokeWidth="0.5"
                />
                <circle
                  cx="30"
                  cy="30"
                  r="20"
                  fill="none"
                  stroke={text}
                  strokeWidth="0.5"
                />
                <circle
                  cx="30"
                  cy="30"
                  r="12"
                  fill="none"
                  stroke={text}
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${patternId})`} />
          </svg>
        );
      case 2: // Horizontal pinstripes
        return (
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.07]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id={patternId}
                width="4"
                height="4"
                patternUnits="userSpaceOnUse"
              >
                <rect x="0" y="0" width="4" height="1" fill={text} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${patternId})`} />
          </svg>
        );
      case 3: // Dots grid
        return (
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.08]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id={patternId}
                width="16"
                height="16"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="8" cy="8" r="1" fill={text} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${patternId})`} />
          </svg>
        );
      case 4: // Cross-hatch
        return (
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.05]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id={patternId}
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M0 10 L20 10 M10 0 L10 20"
                  stroke={text}
                  strokeWidth="0.5"
                  fill="none"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${patternId})`} />
          </svg>
        );
      default:
        return null;
    }
  };

  // Decorative divider element — varies per book
  const dividerStyle = Math.abs(h >> 8) % 3;
  const renderDivider = () => {
    const w = 48;
    switch (dividerStyle) {
      case 0: // Simple line with diamond
        return (
          <svg width={w} height="12" viewBox={`0 0 ${w} 12`} className="my-3">
            <line
              x1="0"
              y1="6"
              x2={w}
              y2="6"
              stroke={accent}
              strokeWidth="0.75"
              opacity="0.6"
            />
            <rect
              x={w / 2 - 3}
              y="3"
              width="6"
              height="6"
              fill={accent}
              opacity="0.6"
              transform={`rotate(45 ${w / 2} 6)`}
            />
          </svg>
        );
      case 1: // Three dots
        return (
          <svg width={w} height="12" viewBox={`0 0 ${w} 12`} className="my-3">
            <circle cx={w / 2 - 8} cy="6" r="1.5" fill={accent} opacity="0.5" />
            <circle cx={w / 2} cy="6" r="1.5" fill={accent} opacity="0.5" />
            <circle cx={w / 2 + 8} cy="6" r="1.5" fill={accent} opacity="0.5" />
          </svg>
        );
      case 2: // Small ornamental line
        return (
          <svg width={w} height="12" viewBox={`0 0 ${w} 12`} className="my-3">
            <line
              x1="8"
              y1="6"
              x2={w - 8}
              y2="6"
              stroke={accent}
              strokeWidth="0.5"
              opacity="0.5"
            />
            <line
              x1="14"
              y1="4"
              x2={w - 14}
              y2="4"
              stroke={accent}
              strokeWidth="0.5"
              opacity="0.3"
            />
            <line
              x1="14"
              y1="8"
              x2={w - 14}
              y2="8"
              stroke={accent}
              strokeWidth="0.5"
              opacity="0.3"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ backgroundColor: bg }}
    >
      {/* Subtle linen / paper texture via noise */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* Pattern overlay */}
      {renderPattern()}

      {/* Spine edge — thin accent strip on the left */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: spineAccent }}
      />
      {/* Secondary spine line */}
      <div
        className="absolute left-[6px] top-0 bottom-0 w-[0.5px] opacity-20"
        style={{ backgroundColor: accent }}
      />

      {/* Inner border frame — classic book cover motif */}
      <div
        className="absolute inset-[10px] left-[14px] border opacity-[0.12] pointer-events-none"
        style={{ borderColor: accent }}
      />
      <div
        className="absolute inset-[12px] left-[16px] border opacity-[0.06] pointer-events-none"
        style={{ borderColor: accent }}
      />

      {/* Corner ornaments */}
      {[
        "top-[10px] left-[14px]",
        "top-[10px] right-[10px] rotate-90",
        "bottom-[10px] right-[10px] rotate-180",
        "bottom-[10px] left-[14px] -rotate-90",
      ].map((pos, i) => (
        <svg
          key={i}
          className={`absolute ${pos} opacity-[0.15]`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
        >
          <path d="M0 0 L12 0 L12 3 L3 3 L3 12 L0 12 Z" fill={accent} />
        </svg>
      ))}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-5 py-6 text-center">
        {/* Top accent line */}
        <div
          className="w-8 h-[1px] mb-4 opacity-30"
          style={{ backgroundColor: accent }}
        />

        {/* Title */}
        <h3
          className="font-serif font-bold leading-tight tracking-wide uppercase line-clamp-4"
          style={{
            color: text,
            fontSize: title.length > 40 ? "0.65rem" : title.length > 25 ? "0.7rem" : "0.8rem",
            letterSpacing: "0.08em",
            textShadow: `0 1px 2px ${bg}80`,
          }}
        >
          {title}
        </h3>

        {/* Decorative divider */}
        {renderDivider()}

        {/* Author */}
        {author && (
          <p
            className="text-[0.55rem] tracking-[0.16em] uppercase opacity-60 line-clamp-1 font-light"
            style={{ color: text }}
          >
            {author}
          </p>
        )}

        {/* Bottom accent line */}
        <div
          className="w-8 h-[1px] mt-4 opacity-30"
          style={{ backgroundColor: accent }}
        />
      </div>

      {/* Subtle vignette for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 30px ${bg}90, inset 0 0 60px ${bg}40`,
        }}
      />

      {/* Bottom-edge shadow to mimic book physicality */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-20"
        style={{
          background: `linear-gradient(to top, black, transparent)`,
        }}
      />
    </div>
  );
};