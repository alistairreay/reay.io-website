import "./style.css";
import { renderAnsiLogo } from "./ansi";

const canvas = document.querySelector<HTMLElement>("#ansi-canvas");
if (canvas) renderAnsiLogo(canvas);
