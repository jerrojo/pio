import type { Mood } from "../lib/experience";

export function Icon({
  name,
  size = 22,
}: {
  name:
    | "mic"
    | "pause"
    | "play"
    | "settings"
    | "arrow"
    | "close"
    | "refresh"
    | "check"
    | "star";
  size?: number;
}) {
  const paths = {
    mic: (
      <>
        <rect x="9" y="2" width="6" height="13" rx="3" />
        <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
      </>
    ),
    pause: (
      <>
        <path d="M9 5v14M15 5v14" />
      </>
    ),
    play: <path d="m8 4 12 8-12 8z" />,
    settings: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="9" cy="7" r="3" />
        <circle cx="15" cy="17" r="3" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    refresh: (
      <path d="M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.5-1L20 12M4 12l2.4 6A7 7 0 0 0 18 17" />
    ),
    check: <path d="m5 12 4 4L19 6" />,
    star: (
      <path d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9l-5.4 2.9 1.1-6.1-4.5-4.3 6.1-.8z" />
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

const frames = [
  "idle",
  "speaking",
  "blink",
  "listening",
  "thinking",
  "happy",
  "cheer",
  "sleepy",
] as const;

// Pío, the only illustration in the product: a 3D-rendered chick with one
// frame per gesture. All frames stay mounted so a change of mood is an instant
// crossfade; CSS picks the visible frame, alternates idle/speaking to move the
// beak, flashes the blink frame, and animates the small effects around it.
export function Mascot({ mood = "idle" }: { mood?: Mood | "still" }) {
  if (mood === "still")
    return (
      <img
        className="mascot-still"
        src="/pio/icon.png"
        alt=""
        width={180}
        height={180}
        draggable={false}
      />
    );
  return (
    <div className={`mascot mood-${mood}`} aria-hidden="true">
      <span className="m-shadow" />
      <div className="m-figure">
        {frames.map((frame) => (
          <img
            key={frame}
            className={`m-frame f-${frame}`}
            src={`/pio/${frame}.webp`}
            alt=""
            width={560}
            height={560}
            draggable={false}
          />
        ))}
      </div>
      <span className="m-fx m-waves">
        <i />
        <i />
        <i />
      </span>
      <span className="m-fx m-dots">
        <i />
        <i />
        <i />
      </span>
      <span className="m-fx m-zzz">
        <i>z</i>
        <i>z</i>
        <i>z</i>
      </span>
      <span className="m-fx m-sparks">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}
