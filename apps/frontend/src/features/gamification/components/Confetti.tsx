/**
 * Confetti — restrained, brand-colored celebration. A dozen pieces in referee
 * colors, gentle fall. Purely decorative (aria-hidden). Reduced-motion users
 * see it settled (global CSS dampens the animation).
 */

const COLORS = ["var(--brand-yellow)", "var(--brand-red)", "var(--success)", "var(--text-primary)"];

// Deterministic piece layout so it reads as designed, not random noise.
const PIECES = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 61) % 100,
  delay: (i % 6) * 0.16,
  duration: 2.4 + ((i * 7) % 12) / 10,
  color: COLORS[i % COLORS.length],
  rotate: (i * 47) % 360,
  size: 6 + (i % 3) * 2,
}));

export default function Confetti() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <style>{`
        @keyframes rl-confetti-fall {
          0% { transform: translateY(-16%) rotate(0deg); opacity: 0; }
          12% { opacity: 1; }
          100% { transform: translateY(360%) rotate(320deg); opacity: 0; }
        }
      `}</style>
      {PIECES.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: "-6%",
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            background: p.color,
            borderRadius: 2,
            transform: `rotate(${p.rotate}deg)`,
            animation: `rl-confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}
