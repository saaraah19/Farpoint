export type CatMood = 'focus' | 'rest' | 'happy' | 'sleepy' | 'idle';

interface CatMascotProps {
  mood: CatMood;
  size?: number;
  className?: string;
}

/**
 * A small hand-drawn-style cat mascot. Everything is plain SVG shapes driven
 * off `mood` — no external images/fonts, so it stays crisp at any size and
 * costs nothing to load.
 */
export default function CatMascot({ mood, size = 96, className }: CatMascotProps) {
  const eyesClosed = mood === 'rest' || mood === 'sleepy';
  const happy = mood === 'happy';
  const focus = mood === 'focus';

  return (
    <svg
      className={`cat-mascot cat-mood-${mood} ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Cat mascot, mood: ${mood}`}
    >
      {/* tail */}
      <path
        className="cat-tail"
        d="M 92 96 Q 116 92 112 68 Q 109 50 94 52"
        fill="none"
        stroke="var(--cat-fur-shade)"
        strokeWidth="9"
        strokeLinecap="round"
      />

      {/* body */}
      <ellipse cx="60" cy="98" rx="30" ry="16" fill="var(--cat-fur)" />

      {/* ears */}
      <path d="M 30 40 L 22 14 L 48 32 Z" fill="var(--cat-fur)" />
      <path d="M 90 40 L 98 14 L 72 32 Z" fill="var(--cat-fur)" />
      <path d="M 33 36 L 28 20 L 44 31 Z" fill="var(--cat-ear-inner)" />
      <path d="M 87 36 L 92 20 L 76 31 Z" fill="var(--cat-ear-inner)" />

      {/* head */}
      <circle cx="60" cy="58" r="34" fill="var(--cat-fur)" />

      {/* cheeks blush */}
      <ellipse cx="38" cy="66" rx="7" ry="4.5" fill="var(--cat-blush)" opacity="0.8" />
      <ellipse cx="82" cy="66" rx="7" ry="4.5" fill="var(--cat-blush)" opacity="0.8" />

      {/* eyes */}
      {eyesClosed ? (
        <>
          <path d="M 42 56 Q 48 61 54 56" stroke="var(--cat-line)" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M 66 56 Q 72 61 78 56" stroke="var(--cat-line)" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : focus ? (
        <>
          <path d="M 43 55 Q 48 51 54 55" stroke="var(--cat-line)" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path d="M 66 55 Q 72 51 78 55" stroke="var(--cat-line)" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="48" cy="55" r="4.4" fill="var(--cat-line)" />
          <circle cx="72" cy="55" r="4.4" fill="var(--cat-line)" />
          <circle cx="49.5" cy="53.3" r="1.3" fill="#fff" />
          <circle cx="73.5" cy="53.3" r="1.3" fill="#fff" />
        </>
      )}

      {/* nose + mouth */}
      <path d="M 57 64 L 63 64 L 60 68 Z" fill="var(--cat-nose)" />
      {happy ? (
        <path d="M 60 68 Q 60 74 52 73 M 60 68 Q 60 74 68 73" stroke="var(--cat-line)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M 60 68 Q 54 73 49 70 M 60 68 Q 66 73 71 70" stroke="var(--cat-line)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      )}

      {/* whiskers */}
      <g stroke="var(--cat-line)" strokeWidth="1.6" strokeLinecap="round" opacity="0.75">
        <path d="M 20 58 L 36 60" />
        <path d="M 20 66 L 36 65" />
        <path d="M 100 58 L 84 60" />
        <path d="M 100 66 L 84 65" />
      </g>

      {/* paws */}
      <ellipse cx="46" cy="108" rx="8" ry="6" fill="var(--cat-fur)" />
      <ellipse cx="74" cy="108" rx="8" ry="6" fill="var(--cat-fur)" />

      {happy && (
        <g className="cat-sparkles" fill="var(--amber)">
          <path d="M 18 30 l 2 6 l 6 2 l -6 2 l -2 6 l -2 -6 l -6 -2 l 6 -2 z" />
          <path d="M 104 42 l 1.6 4.6 l 4.6 1.6 l -4.6 1.6 l -1.6 4.6 l -1.6 -4.6 l -4.6 -1.6 l 4.6 -1.6 z" />
        </g>
      )}
    </svg>
  );
}
