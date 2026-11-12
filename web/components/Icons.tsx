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

const spark = "M0-6 1.5-1.5 6 0 1.5 1.5 0 6-1.5 1.5-6 0-1.5-1.5z";

// Pío, the only illustration in the product. Its face and posture mirror the
// session state; every animated part is toggled from CSS by the mood class.
export function Mascot({ mood = "idle" }: { mood?: Mood | "still" }) {
  return (
    <svg
      className={`mascot mood-${mood}`}
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
    >
      <g
        className="m-feet"
        stroke="#f08a3c"
        strokeWidth="4"
        strokeLinecap="round"
      >
        <path d="M50 100v9M70 100v9" />
      </g>
      <g className="m-body">
        <path
          className="m-tuft"
          d="M60 34c-6-8-3-15 1-18 0 5 2 7 5 9 1-4 4-6 8-6-3 5-3 10-6 15z"
          fill="#f5b94a"
        />
        <ellipse
          className="m-wing m-wing-l"
          cx="24"
          cy="72"
          rx="9"
          ry="14"
          fill="#f5b94a"
        />
        <ellipse
          className="m-wing m-wing-r"
          cx="96"
          cy="72"
          rx="9"
          ry="14"
          fill="#f5b94a"
        />
        <ellipse cx="60" cy="68" rx="38" ry="36" fill="#ffd978" />
        <ellipse cx="50" cy="56" rx="22" ry="17" fill="#fff0b3" opacity=".55" />
        <ellipse cx="38" cy="78" rx="7" ry="4.5" fill="#ff9f8e" opacity=".8" />
        <ellipse cx="82" cy="78" rx="7" ry="4.5" fill="#ff9f8e" opacity=".8" />
        <g className="m-eyes m-eyes-open">
          <circle cx="45" cy="64" r="5.5" fill="#2b2118" />
          <circle cx="75" cy="64" r="5.5" fill="#2b2118" />
          <circle cx="47" cy="62" r="1.8" fill="#fff" />
          <circle cx="77" cy="62" r="1.8" fill="#fff" />
        </g>
        <g
          className="m-eyes m-eyes-happy"
          stroke="#2b2118"
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
        >
          <path d="M39 66q6-8 12 0M69 66q6-8 12 0" />
        </g>
        <g
          className="m-eyes m-eyes-closed"
          stroke="#2b2118"
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
        >
          <path d="M39 64q6 6 12 0M69 64q6 6 12 0" />
        </g>
        <path className="m-beak-low" d="M53 76q7 9 14 0z" fill="#e2772e" />
        <path
          className="m-beak"
          d="M51 74q9-9 18 0q-9 6-18 0z"
          fill="#ff9d4d"
        />
      </g>
      <g className="m-zzz" fill="#14352a" fontWeight="800">
        <text x="84" y="36" fontSize="15">
          z
        </text>
        <text x="95" y="24" fontSize="11">
          z
        </text>
      </g>
      <g
        className="m-notes"
        stroke="#14352a"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M104 60q5 8 0 16" />
        <path d="M110 54q9 14 0 28" />
      </g>
      <g className="m-dots" fill="#14352a">
        <circle cx="84" cy="32" r="2.6" />
        <circle cx="91" cy="24" r="3.4" />
        <circle cx="99" cy="15" r="4.2" />
      </g>
      <g className="m-sparks" fill="#fffbe6">
        <path d={spark} transform="translate(13 28)" />
        <path d={spark} transform="translate(108 30) scale(.75)" />
        <path d={spark} transform="translate(104 98) scale(.6)" />
        <path d={spark} transform="translate(15 94) scale(.55)" />
      </g>
    </svg>
  );
}
