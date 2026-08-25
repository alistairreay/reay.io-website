import "./style.css";

const artStage = document.querySelector<HTMLElement>(".art-stage");
const canTilt = window.matchMedia("(hover: hover) and (pointer: fine)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function resetTilt() {
  artStage?.style.setProperty("--tilt-x", "0deg");
  artStage?.style.setProperty("--tilt-y", "0deg");
  artStage?.style.setProperty("--shine-x", "50%");
  artStage?.style.setProperty("--shine-y", "50%");
}

artStage?.addEventListener("pointermove", (event) => {
  if (!canTilt.matches || reduceMotion.matches) return;

  const bounds = artStage.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width;
  const y = (event.clientY - bounds.top) / bounds.height;

  artStage.style.setProperty("--tilt-x", `${((0.5 - y) * 3.5).toFixed(2)}deg`);
  artStage.style.setProperty("--tilt-y", `${((x - 0.5) * 4.5).toFixed(2)}deg`);
  artStage.style.setProperty("--shine-x", `${(x * 100).toFixed(1)}%`);
  artStage.style.setProperty("--shine-y", `${(y * 100).toFixed(1)}%`);
});

artStage?.addEventListener("pointerleave", resetTilt);
