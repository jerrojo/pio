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

// Pío, the only illustration in the product. Drawn with the lighting of a 3D
// animated film: key light from the upper left, warm bounce below, a rim light
// on the right and large glossy eyes. Its face and posture mirror the session
// state; every animated part is toggled from CSS by the mood class.
export function Mascot({ mood = "idle" }: { mood?: Mood | "still" }) {
  return (
    <svg
      className={`mascot mood-${mood}`}
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="pio-body" cx="0.36" cy="0.28" r="0.85">
          <stop offset="0" stopColor="#fff6c4" />
          <stop offset="0.38" stopColor="#ffe083" />
          <stop offset="0.76" stopColor="#f8bd4b" />
          <stop offset="1" stopColor="#e2902f" />
        </radialGradient>
        <radialGradient id="pio-belly" cx="0.5" cy="0.45" r="0.55">
          <stop offset="0" stopColor="#fffbe0" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fffbe0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pio-wing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbcb5c" />
          <stop offset="1" stopColor="#dd8a2b" />
        </linearGradient>
        <linearGradient id="pio-beak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffbd6e" />
          <stop offset="1" stopColor="#f37a26" />
        </linearGradient>
        <radialGradient id="pio-sclera" cx="0.42" cy="0.36" r="0.75">
          <stop offset="0.55" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe6ea" />
        </radialGradient>
        <radialGradient id="pio-iris" cx="0.5" cy="0.62" r="0.62">
          <stop offset="0" stopColor="#c98445" />
          <stop offset="0.7" stopColor="#8a4d20" />
          <stop offset="1" stopColor="#4f2a10" />
        </radialGradient>
        <radialGradient id="pio-blush">
          <stop offset="0" stopColor="#ff8a80" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ff8a80" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pio-ground">
          <stop offset="0" stopColor="#0d2e26" stopOpacity="0.55" />
          <stop offset="1" stopColor="#0d2e26" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pio-ao">
          <stop offset="0" stopColor="#b9651c" stopOpacity="0.5" />
          <stop offset="1" stopColor="#b9651c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="111" rx="27" ry="5" fill="url(#pio-ground)" />
      <g
        className="m-feet"
        stroke="#ee7f2a"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M49 101v8m-5 1 5-1 5 1M71 101v8m-5 1 5-1 5 1" />
      </g>
      <g className="m-body">
        <path
          className="m-tuft"
          d="M57 33c-7-7-6-15-2-19 1 5 3 7 6 9 0-5 3-9 8-10-3 6-2 10-4 14 3-3 6-4 10-3-5 3-7 7-10 10z"
          fill="url(#pio-wing)"
        />
        <path
          className="m-wing m-wing-l"
          d="M25 60c-9 6-11 20-5 29 5-2 9-8 10-15z"
          fill="url(#pio-wing)"
        />
        <path
          className="m-wing m-wing-r"
          d="M95 60c9 6 11 20 5 29-5-2-9-8-10-15z"
          fill="url(#pio-wing)"
        />
        <path
          d="M60 30c24 0 38 20 38 42 0 21-16 33-38 33S22 93 22 72c0-22 14-42 38-42z"
          fill="url(#pio-body)"
        />
        <ellipse cx="60" cy="90" rx="24" ry="15" fill="url(#pio-belly)" />
        <ellipse
          cx="45"
          cy="43"
          rx="13"
          ry="6.5"
          fill="#fff"
          opacity=".38"
          transform="rotate(-24 45 43)"
        />
        <path
          d="M93 54c7 12 7 30-4 42"
          stroke="#fff3c4"
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
          opacity=".6"
        />
        <ellipse cx="32" cy="82" rx="9" ry="6" fill="url(#pio-blush)" />
        <ellipse cx="88" cy="82" rx="9" ry="6" fill="url(#pio-blush)" />
        <g
          className="m-brows"
          stroke="#cf8e2d"
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
        >
          <path className="m-brow-l" d="M37 49q8-4 15-1" />
          <path className="m-brow-r" d="M68 48q7-3 15 1" />
        </g>
        <g className="m-eyes m-eyes-open">
          <ellipse cx="45" cy="65" rx="10.5" ry="12" fill="url(#pio-sclera)" />
          <ellipse cx="75" cy="65" rx="10.5" ry="12" fill="url(#pio-sclera)" />
          <g className="m-iris">
            <circle cx="46" cy="66.5" r="8" fill="url(#pio-iris)" />
            <circle cx="74" cy="66.5" r="8" fill="url(#pio-iris)" />
            <circle cx="46" cy="66.5" r="4.6" fill="#1c0f07" />
            <circle cx="74" cy="66.5" r="4.6" fill="#1c0f07" />
            <circle cx="43" cy="62.5" r="2.7" fill="#fff" />
            <circle cx="71" cy="62.5" r="2.7" fill="#fff" />
            <circle cx="49.5" cy="70" r="1.2" fill="#fff" opacity=".8" />
            <circle cx="77.5" cy="70" r="1.2" fill="#fff" opacity=".8" />
          </g>
          <path
            d="M34.6 62q10.4-14 20.8 0M64.6 62q10.4-14 20.8 0"
            stroke="#b9772a"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            opacity=".7"
          />
        </g>
        <g
          className="m-eyes m-eyes-happy"
          stroke="#4a2a12"
          strokeWidth="3.6"
          strokeLinecap="round"
          fill="none"
        >
          <path d="M36 68q9-12 18 0M66 68q9-12 18 0" />
        </g>
        <g
          className="m-eyes m-eyes-closed"
          stroke="#4a2a12"
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
        >
          <path d="M36 65q9 8 18 0M66 65q9 8 18 0" />
        </g>
        <ellipse cx="60" cy="86" rx="10" ry="4" fill="url(#pio-ao)" />
        <path className="m-beak-low" d="M53.5 80q6.5 8 13 0z" fill="#d5621c" />
        <path
          className="m-beak"
          d="M50 78q10-10 20 0q-10 7-20 0z"
          fill="url(#pio-beak)"
        />
        <ellipse
          cx="56.5"
          cy="75.6"
          rx="3.2"
          ry="1.2"
          fill="#fff"
          opacity=".55"
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
        <path d="M104 62q5 8 0 16" />
        <path d="M110 56q9 14 0 28" />
      </g>
      <g className="m-dots" fill="#14352a">
        <circle cx="86" cy="30" r="2.6" />
        <circle cx="93" cy="22" r="3.4" />
        <circle cx="101" cy="13" r="4.2" />
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
