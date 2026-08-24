const WIDTH = 128;
const HEIGHT = 70;

const PALETTE = [
  "#000000", "#0000aa", "#00aa00", "#00aaaa",
  "#aa0000", "#aa00aa", "#aa5500", "#aaaaaa",
  "#555555", "#5555ff", "#55ff55", "#55ffff",
  "#ff5555", "#ff55ff", "#ffff55", "#ffffff",
];

type Point = [number, number];
type Ink = { hi: number; mid: number; low: number; edge: number; shade: number };

const pixels = new Uint8Array(WIDTH * HEIGHT);

function at(x: number, y: number) {
  return y * WIDTH + x;
}

function put(x: number, y: number, color: number) {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT) pixels[at(px, py)] = color;
}

function disc(target: Uint8Array, cx: number, cy: number, radius: number) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) target[at(x, y)] = 1;
      }
    }
  }
}

function stroke(target: Uint8Array, points: Point[], radius: number) {
  for (let p = 0; p < points.length - 1; p += 1) {
    const [ax, ay] = points[p];
    const [bx, by] = points[p + 1];
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      disc(target, ax + (bx - ax) * t, ay + (by - ay) * t, radius);
    }
  }
}

function arc(
  target: Uint8Array,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  start: number,
  end: number,
  radius: number,
) {
  const points: Point[] = [];
  const steps = 72;
  for (let step = 0; step <= steps; step += 1) {
    const angle = start + (end - start) * (step / steps);
    points.push([cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry]);
  }
  stroke(target, points, radius);
}

function dilate(source: Uint8Array, radius: number) {
  const result = new Uint8Array(source.length);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (!source[at(x, y)]) continue;
      disc(result, x, y, radius);
    }
  }
  return result;
}

function drawLine(points: Point[], radius: number, color: number) {
  const layer = new Uint8Array(pixels.length);
  stroke(layer, points, radius);
  layer.forEach((value, index) => {
    if (value) pixels[index] = color;
  });
}

function drawBackground() {
  // A single fractured halo, visually tied to the central letter junction.
  drawLine([[64, 3], [64, 15]], 0.55, 8);
  drawLine([[49, 9], [57, 15]], 0.45, 8);
  drawLine([[79, 9], [71, 15]], 0.45, 8);
  drawLine([[55, 5], [60, 13]], 0.35, 3);
  drawLine([[73, 5], [68, 13]], 0.35, 1);
  drawLine([[43, 15], [55, 17]], 0.45, 8);
  drawLine([[85, 15], [73, 17]], 0.45, 8);
  [[64, 1, 15], [44, 7, 11], [84, 7, 14], [39, 14, 9], [89, 14, 3],
   [31, 18, 1], [97, 18, 3], [22, 11, 6], [106, 10, 14]].forEach(([x, y, c]) => {
    put(x, y, c); put(x + 1, y, c);
  });

  // Angular wings grow directly out of the wordmark rather than floating as confetti.
  drawLine([[7, 31], [3, 27], [3, 21], [13, 21], [18, 24]], 0.65, 3);
  drawLine([[121, 31], [125, 27], [125, 21], [116, 21], [111, 24]], 0.65, 1);
  drawLine([[8, 19], [18, 16], [28, 19]], 0.55, 8);
  drawLine([[120, 19], [110, 16], [100, 19]], 0.55, 8);
  put(3, 24, 11); put(124, 24, 14);

  // The underline is one continuous flourish, caught by the y descender.
  drawLine([[2, 56], [18, 53], [34, 58], [49, 54], [65, 60], [81, 54], [98, 59], [125, 53]], 2.0, 8);
  drawLine([[2, 55], [18, 52], [34, 57], [49, 53], [65, 59], [81, 53], [98, 58], [125, 52]], 0.85, 11);
  drawLine([[2, 58], [18, 55], [34, 60], [49, 56], [65, 62], [81, 56], [98, 61], [125, 55]], 0.75, 6);

  // A restrained textmode pedestal concentrates detail below the descender.
  const barColors = [1, 9, 3, 11, 6, 14];
  for (let x = 50; x < 88; x += 4) {
    const top = 62 + ((x * 7) % 4);
    for (let y = top; y < 69; y += 1) {
      if ((x + y) % 5 !== 0) put(x, y, barColors[(x / 4) % barColors.length | 0]);
    }
    if (x % 8 === 2) put(x + 1, top, 15);
  }
}

function edgeOf(mask: Uint8Array, x: number, y: number, dx: number, dy: number) {
  const nx = x + dx;
  const ny = y + dy;
  return nx < 0 || nx >= WIDTH || ny < 0 || ny >= HEIGHT || !mask[at(nx, ny)];
}

function paintGlyph(mask: Uint8Array, ink: Ink, order: number) {
  const outline = dilate(mask, 1.55);
  const shadow = dilate(mask, 2.6);

  for (let y = 0; y < HEIGHT - 4; y += 1) {
    for (let x = 0; x < WIDTH - 3; x += 1) {
      if (shadow[at(x, y)] && !outline[at(x, y)]) put(x + 2, y + 3, order === 3 ? 6 : 1);
    }
  }

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const index = at(x, y);
      if (outline[index] && !mask[index]) {
        put(x, y, ((x + y + order) % 17 === 0) ? 8 : 0);
      }
    }
  }

  // Repaint a crisp two-color contour after the black keyline.
  const tight = dilate(mask, 0.9);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const index = at(x, y);
      if (tight[index] && !mask[index]) put(x, y, ink.edge);
    }
  }

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const index = at(x, y);
      if (!mask[index]) continue;
      const upperEdge = edgeOf(mask, x, y, 0, -1) || edgeOf(mask, x, y, -1, 0);
      const lowerEdge = edgeOf(mask, x, y, 0, 1) || edgeOf(mask, x, y, 1, 0);
      let color = y < 31 ? ink.hi : y < 43 ? ink.mid : ink.low;
      if (upperEdge && (x * 2 + y + order) % 7 < 2) color = 15;
      else if (lowerEdge) color = ink.shade;
      else if ((x * 5 + y * 3 + order) % 19 === 0) color = ink.edge;
      else if (y > 38 && (x * 3 + y + order) % 11 < 2) color = ink.shade;
      put(x, y, color);
    }
  }
}

function makeGlyph(draw: (mask: Uint8Array) => void, ink: Ink, order: number) {
  const mask = new Uint8Array(pixels.length);
  draw(mask);
  paintGlyph(mask, ink, order);
}

function drawLetters() {
  // r — short ascender, open shoulder, no diagonal capital leg.
  makeGlyph((m) => {
    stroke(m, [[9, 29], [9, 50]], 3.2);
    stroke(m, [[9, 33], [12, 26], [18, 23], [22, 27], [21, 34]], 3.0);
  }, { hi: 11, mid: 3, low: 9, edge: 15, shade: 1 }, 0);

  // e — rounded lowercase counter with a deliberately broken lower terminal.
  makeGlyph((m) => {
    arc(m, 34, 37, 9, 12.5, -0.28, Math.PI * 1.78, 2.9);
    stroke(m, [[26, 36], [41, 36]], 2.6);
    stroke(m, [[27, 47], [32, 50], [39, 48]], 2.4);
  }, { hi: 11, mid: 3, low: 9, edge: 15, shade: 1 }, 1);

  // a — single-storey bowl with a high right shoulder and undercurl.
  makeGlyph((m) => {
    arc(m, 54, 38, 8, 11.5, 0, Math.PI * 2, 2.8);
    stroke(m, [[62, 27], [62, 49], [66, 51]], 2.8);
    stroke(m, [[49, 50], [56, 52], [63, 48]], 2.0);
  }, { hi: 11, mid: 3, low: 9, edge: 15, shade: 1 }, 2);

  // y — twin lowercase arms meeting in a long hooked descender.
  makeGlyph((m) => {
    stroke(m, [[70, 27], [77, 43]], 3.0);
    stroke(m, [[86, 26], [77, 44], [78, 55], [73, 62], [67, 62]], 3.1);
  }, { hi: 14, mid: 12, low: 6, edge: 15, shade: 4 }, 3);

  // period.
  makeGlyph((m) => {
    disc(m, 91, 49, 2.8);
  }, { hi: 15, mid: 14, low: 6, edge: 12, shade: 4 }, 4);

  // i — unmistakably lowercase, detached dot.
  makeGlyph((m) => {
    stroke(m, [[98, 34], [98, 50]], 3.0);
    disc(m, 98, 25, 3.1);
  }, { hi: 11, mid: 3, low: 9, edge: 15, shade: 1 }, 5);

  // o — rounded lowercase terminal with offset interior color cuts.
  makeGlyph((m) => {
    arc(m, 113, 38, 9, 12, 0, Math.PI * 2, 3.1);
  }, { hi: 11, mid: 3, low: 9, edge: 15, shade: 1 }, 6);
}

function addFinishingCells() {
  // Sparse intentional glints, limited to the chosen cool ramp and warm accent.
  const accents: Array<[number, number, number]> = [
    [17, 17, 11], [33, 16, 3], [48, 18, 9], [56, 14, 11],
    [72, 18, 14], [81, 17, 6], [94, 19, 3], [111, 17, 11],
  ];
  accents.forEach(([x, y, color], index) => {
    put(x, y, color);
    if (index % 4 === 0) put(x + 1, y, color);
  });

  // Small four-way star above the lockup.
  put(64, 10, 15); put(64, 11, 15); put(64, 12, 7);
  put(62, 12, 8); put(63, 12, 15); put(65, 12, 15); put(66, 12, 8);
  put(64, 13, 11); put(64, 14, 3);
}

function span(text: string, foreground: number, background = 0) {
  return `<span style="color:${PALETTE[foreground]};background-color:${PALETTE[background]}">${text}</span>`;
}

function toAnsiHtml() {
  const rows: string[] = [];
  for (let y = 0; y < HEIGHT; y += 2) {
    let row = "";
    let runText = "";
    let runFg = -1;
    let runBg = -1;

    const flush = () => {
      if (!runText) return;
      row += runFg === 0 && runBg === 0 ? runText : span(runText, runFg, runBg);
      runText = "";
    };

    for (let x = 0; x < WIDTH; x += 1) {
      const top = pixels[at(x, y)];
      const bottom = pixels[at(x, y + 1)];
      let character = "▀";
      let foreground = top;
      let background = bottom;
      if (top === 0 && bottom === 0) character = " ";
      else if (top === bottom) {
        character = "█";
        background = 0;
      }

      if (foreground !== runFg || background !== runBg) {
        flush();
        runFg = foreground;
        runBg = background;
      }
      runText += character;
    }
    flush();
    rows.push(row);
  }
  return rows.join("\n");
}

export function renderAnsiLogo(element: HTMLElement) {
  pixels.fill(0);
  drawBackground();
  drawLetters();
  addFinishingCells();
  element.innerHTML = toAnsiHtml();
}
