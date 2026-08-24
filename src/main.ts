import "./style.css";
import { renderAnsiLogo } from "./ansi";

const canvas = document.querySelector<HTMLElement>("#ansi-canvas");
const requestedDesign = Number(new URLSearchParams(window.location.search).get("design") ?? "1");
const design = Math.min(6, Math.max(1, Number.isFinite(requestedDesign) ? requestedDesign : 1));

document.documentElement.dataset.design = String(design);
const accessibleTitle = document.querySelector<HTMLElement>("h1");
if (accessibleTitle) accessibleTitle.textContent = design === 4 ? "REAY.IO" : "reay.io";
if (canvas) renderAnsiLogo(canvas, design);
