// Small flourishes drawn straight on the page. Each one is over in under a
// second, never blocks a tap, and is skipped for people who asked their
// device for less motion.
const calm = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;
const able = (element: Element | null): element is HTMLElement =>
  !!element && typeof (element as HTMLElement).animate === "function";

// A star leaves Pío and lands on today's count when a phrase is said well.
export function flyStar(from: Element | null, to: Element | null) {
  if (calm() || !able(from) || !able(to)) return;
  const a = from.getBoundingClientRect(),
    b = to.getBoundingClientRect();
  const size = 28;
  const x0 = a.left + a.width / 2 - size / 2,
    y0 = a.top + a.height / 2 - size / 2,
    x1 = b.left + 6,
    y1 = b.top + b.height / 2 - size / 2;
  const star = document.createElement("span");
  star.className = "fly-star";
  star.textContent = "★";
  star.setAttribute("aria-hidden", "true");
  document.body.appendChild(star);
  const at = (x: number, y: number, more: string) =>
    `translate(${x}px, ${y}px) ${more}`;
  const flight = star.animate(
    [
      { transform: at(x0, y0, "scale(0.3) rotate(0deg)"), opacity: 0 },
      {
        transform: at(x0, y0 - 24, "scale(1.5) rotate(40deg)"),
        opacity: 1,
        offset: 0.2,
      },
      {
        transform: at(
          (x0 + x1) / 2,
          Math.max(8, Math.min(y0, y1) - 40),
          "scale(1.1) rotate(220deg)",
        ),
        opacity: 1,
        offset: 0.65,
      },
      { transform: at(x1, y1, "scale(0.6) rotate(360deg)"), opacity: 1 },
    ],
    { duration: 900, easing: "cubic-bezier(0.35, 0, 0.25, 1)" },
  );
  const land = () => {
    star.remove();
    // The count may have been redrawn while the star flew.
    const chip = document.querySelector(".chip.progress");
    if (able(chip))
      chip.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.4) rotate(-8deg)" },
          { transform: "scale(1)" },
        ],
        { duration: 380, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
      );
  };
  flight.onfinish = land;
  flight.oncancel = () => star.remove();
}

// A ring that opens from a button the moment it is tapped.
export function ripple(button: Element | null) {
  if (calm() || !able(button)) return;
  const ring = document.createElement("span");
  ring.className = "tap-ripple";
  ring.setAttribute("aria-hidden", "true");
  button.appendChild(ring);
  const wave = ring.animate(
    [
      { transform: "scale(1)", opacity: 0.6 },
      { transform: "scale(1.75)", opacity: 0 },
    ],
    { duration: 480, easing: "ease-out" },
  );
  wave.onfinish = wave.oncancel = () => ring.remove();
}

// A little jump, for Pío when someone taps it.
export function hop(element: Element | null) {
  if (calm() || !able(element)) return;
  element.animate(
    [
      { transform: "translateY(0) scale(1, 1)" },
      { transform: "translateY(-9%) scale(0.96, 1.05)", offset: 0.35 },
      { transform: "translateY(0) scale(1.06, 0.94)", offset: 0.75 },
      { transform: "translateY(0) scale(1, 1)" },
    ],
    { duration: 460, easing: "ease-out" },
  );
}
