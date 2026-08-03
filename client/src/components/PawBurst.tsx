interface PawBurstProps {
  active: boolean;
}

const PAWS = Array.from({ length: 10 }, (_, i) => i);

/** A short burst of falling paw prints, shown for a couple seconds when triggered. */
export default function PawBurst({ active }: PawBurstProps) {
  if (!active) return null;
  return (
    <div className="paw-burst" aria-hidden="true">
      {PAWS.map((i) => (
        <span
          key={i}
          className="paw-burst-item"
          style={{
            left: `${4 + i * 10}%`,
            animationDelay: `${(i % 5) * 0.09}s`,
            fontSize: `${14 + (i % 3) * 6}px`,
          }}
        >
          🐾
        </span>
      ))}
    </div>
  );
}
