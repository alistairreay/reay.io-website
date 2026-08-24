import "./style.css";
import { OpalescentShader } from "./shader";

const root = document.documentElement;
const canvas = document.querySelector<HTMLCanvasElement>("#opalescence");
const stack = document.querySelector<HTMLElement>("#logo-stack");
const master = document.querySelector<HTMLElement>(".ascii.master");
const themeButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>("[data-theme-choice]"),
);

const seed = Math.random();
const hue = Math.floor(seed * 360);
const palette = [hue, (hue + 54) % 360, (hue + 146) % 360, (hue + 232) % 360];

root.style.setProperty("--hue-a", `${palette[0]}`);
root.style.setProperty("--hue-b", `${palette[1]}`);
root.style.setProperty("--hue-c", `${palette[2]}`);
root.style.setProperty("--hue-d", `${palette[3]}`);

if (stack && master) {
  for (let depth = 18; depth >= 1; depth -= 1) {
    const layer = master.cloneNode(true) as HTMLElement;
    layer.classList.remove("master");
    layer.classList.add("depth-layer");
    layer.style.setProperty("--depth", `${depth}`);
    stack.prepend(layer);
  }
}

let currentTheme: "light" | "dark";
const savedTheme = localStorage.getItem("reay-theme");
currentTheme =
  savedTheme === "light" || savedTheme === "dark"
    ? savedTheme
    : window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";

let shader: OpalescentShader | null = null;
if (canvas) shader = new OpalescentShader(canvas, palette, seed);

function setTheme(theme: "light" | "dark") {
  currentTheme = theme;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  localStorage.setItem("reay-theme", theme);
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute(
    "content",
    theme === "dark" ? "#07070a" : "#f4f1ed",
  );
  themeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.themeChoice === theme));
  });
  shader?.setTheme(theme);
}

themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const theme = button.dataset.themeChoice;
    if (theme === "light" || theme === "dark") setTheme(theme);
  });
});

setTheme(currentTheme);

let pointerX = 0;
let pointerY = 0;
let targetX = 0;
let targetY = 0;
let frame = 0;

function renderTilt() {
  pointerX += (targetX - pointerX) * 0.055;
  pointerY += (targetY - pointerY) * 0.055;
  root.style.setProperty("--tilt-x", `${pointerY * -7.5}deg`);
  root.style.setProperty("--tilt-y", `${pointerX * 10}deg`);
  root.style.setProperty("--drift-x", `${pointerX * 13}px`);
  root.style.setProperty("--drift-y", `${pointerY * 9}px`);
  frame = requestAnimationFrame(renderTilt);
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  window.addEventListener("pointermove", (event) => {
    targetX = event.clientX / window.innerWidth - 0.5;
    targetY = event.clientY / window.innerHeight - 0.5;
    shader?.setPointer(event.clientX, event.clientY);
  });
  window.addEventListener("pointerleave", () => {
    targetX = 0;
    targetY = 0;
  });
  frame = requestAnimationFrame(renderTilt);
}

window.addEventListener("pagehide", () => {
  cancelAnimationFrame(frame);
  shader?.destroy();
});
