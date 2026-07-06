/**
 * RefMascot — "Hawk", the RefLab official mascot.
 *
 * A sharp-eyed falcon official (precision officiating / hawk-eye). Clean, flat,
 * geometric — celebratory, not childish. Used only in victory / transition
 * moments. Expression is driven by `mood`; the body stays constant.
 */

export type MascotMood = "celebrate" | "cheer" | "neutral" | "focus" | "sad";

interface RefMascotProps {
  mood?: MascotMood;
  size?: number;
  className?: string;
  title?: string;
}

export default function RefMascot({
  mood = "neutral",
  size = 120,
  className = "",
  title = "Hawk",
}: RefMascotProps) {
  const happy = mood === "celebrate" || mood === "cheer";
  const sad = mood === "sad";
  const focus = mood === "focus";

  return (
    <svg
      viewBox="0 0 120 128"
      width={size}
      height={(size * 128) / 120}
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="rm-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#28345c" />
          <stop offset="1" stopColor="#1b2440" />
        </linearGradient>
        <linearGradient id="rm-beak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd75a" />
          <stop offset="1" stopColor="#f0a800" />
        </linearGradient>
      </defs>

      {/* celebrate sparkles */}
      {mood === "celebrate" && (
        <g fill="var(--brand-yellow)">
          <path d="M22 20l2.2 5.2L29 27l-4.8 1.8L22 34l-2.2-5.2L15 27l4.8-1.8z" opacity="0.9" />
          <path d="M99 30l1.6 3.8L104 35l-3.4 1.3L99 40l-1.6-3.7L94 35l3.4-1.2z" opacity="0.8" />
          <circle cx="104" cy="64" r="2.4" opacity="0.7" />
          <circle cx="16" cy="58" r="2" opacity="0.6" />
        </g>
      )}

      {/* ear tufts */}
      <path d="M38 30c-3-9-2-16 2-20 2 6 4 10 8 13z" fill="url(#rm-body)" />
      <path d="M82 30c3-9 2-16-2-20-2 6-4 10-8 13z" fill="url(#rm-body)" />

      {/* body */}
      <path
        d="M60 22c22 0 34 15 34 37 0 26-15 43-34 43S26 85 26 59c0-22 12-37 34-37z"
        fill="url(#rm-body)"
        stroke="#33406b"
        strokeWidth="1.5"
      />

      {/* chest / referee shirt panel with subtle stripe */}
      <path
        d="M60 66c11 0 19 6 21 17 1 6-9 13-21 13s-22-7-21-13c2-11 10-17 21-17z"
        fill="#0f1524"
        opacity="0.55"
      />
      <path d="M60 66v30" stroke="#33406b" strokeWidth="2" opacity="0.5" />

      {/* whistle on a lanyard */}
      <path d="M49 64l11 6 11-6" fill="none" stroke="var(--brand-red)" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
      <g transform="translate(60 74)">
        <rect x="-6" y="-3.4" width="10.5" height="6.8" rx="3.4" fill="var(--brand-yellow)" />
        <circle cx="5.2" cy="0" r="3.4" fill="var(--brand-yellow)" />
        <circle cx="5.2" cy="0" r="1.5" fill="#0f1524" />
      </g>

      {/* eye discs (hawk mask) */}
      <g>
        <circle cx="47" cy="52" r="15" fill="#f6f8fc" />
        <circle cx="73" cy="52" r="15" fill="#f6f8fc" />
        <circle cx="47" cy="52" r="15" fill="none" stroke="var(--brand-yellow)" strokeWidth="2.5" />
        <circle cx="73" cy="52" r="15" fill="none" stroke="var(--brand-yellow)" strokeWidth="2.5" />

        {sad ? (
          <>
            <path d="M40 54c3-3 11-3 14 0" fill="none" stroke="#1b2440" strokeWidth="3" strokeLinecap="round" />
            <path d="M66 54c3-3 11-3 14 0" fill="none" stroke="#1b2440" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : happy ? (
          <>
            <path d="M40 50c3 5 11 5 14 0" fill="none" stroke="#1b2440" strokeWidth="3.4" strokeLinecap="round" />
            <path d="M66 50c3 5 11 5 14 0" fill="none" stroke="#1b2440" strokeWidth="3.4" strokeLinecap="round" />
          </>
        ) : focus ? (
          <>
            <circle cx="49" cy="52" r="4.6" fill="#1b2440" />
            <circle cx="71" cy="52" r="4.6" fill="#1b2440" />
            <circle cx="50.4" cy="50.6" r="1.4" fill="#f6f8fc" />
            <circle cx="72.4" cy="50.6" r="1.4" fill="#f6f8fc" />
          </>
        ) : (
          <>
            <circle cx="48" cy="53" r="6" fill="#1b2440" />
            <circle cx="72" cy="53" r="6" fill="#1b2440" />
            <circle cx="50" cy="51" r="1.9" fill="#f6f8fc" />
            <circle cx="74" cy="51" r="1.9" fill="#f6f8fc" />
          </>
        )}
      </g>

      {/* brows — angle by mood */}
      {sad ? (
        <>
          <path d="M35 39l14 5" stroke="#33406b" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M85 39l-14 5" stroke="#33406b" strokeWidth="3.4" strokeLinecap="round" />
        </>
      ) : focus ? (
        <>
          <path d="M35 41l16-2" stroke="#33406b" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M85 41l-16-2" stroke="#33406b" strokeWidth="3.6" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M35 40l15 1" stroke="#33406b" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M85 40l-15 1" stroke="#33406b" strokeWidth="3.4" strokeLinecap="round" />
        </>
      )}

      {/* beak */}
      <path d="M60 58l6 7-6 4-6-4z" fill="url(#rm-beak)" stroke="#c98800" strokeWidth="0.8" />

      {/* celebrate: raised yellow card */}
      {mood === "celebrate" && (
        <g transform="rotate(14 96 46)">
          <rect x="88" y="30" width="15" height="21" rx="2.4" fill="var(--brand-yellow)" stroke="#c98800" strokeWidth="1" />
        </g>
      )}
    </svg>
  );
}
