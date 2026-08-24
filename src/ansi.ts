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
type Paint = {
  shadow: number;
  accent: number;
  outline?: number;
  texture?: "bands" | "checker" | "slashes" | "solid";
};

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

function maskRect(target: Uint8Array, x: number, y: number, width: number, height: number) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT) target[at(px, py)] = 1;
    }
  }
}

function pixelRect(x: number, y: number, width: number, height: number, color: number) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) put(px, py, color);
  }
}

function leaf(cx: number, cy: number, flip: number, color: number) {
  drawLine([[cx, cy], [cx + 3 * flip, cy - 3], [cx + 6 * flip, cy - 2], [cx + 3 * flip, cy + 2], [cx, cy]], 0.9, color);
  put(cx + 3 * flip, cy - 1, color === 10 ? 2 : color);
}

function drawChromeBackground() {
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

function paintGlyph(mask: Uint8Array, ink: Ink, order: number, paint: Paint) {
  const outline = dilate(mask, paint.outline ?? 1.55);
  const shadow = dilate(mask, 2.6);

  for (let y = 0; y < HEIGHT - 4; y += 1) {
    for (let x = 0; x < WIDTH - 3; x += 1) {
      if (shadow[at(x, y)] && !outline[at(x, y)]) put(x + 2, y + 3, paint.shadow);
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
      else if (paint.texture === "checker" && (x + y + order) % 4 === 0) color = ink.shade;
      else if (paint.texture === "slashes" && (x - y + order * 3) % 9 === 0) color = paint.accent;
      else if (paint.texture === "bands" && y > 38 && (x * 3 + y + order) % 11 < 2) color = ink.shade;
      else if ((x * 7 + y * 5 + order) % 47 === 0) color = paint.accent;
      put(x, y, color);
    }
  }
}

function makeGlyph(draw: (mask: Uint8Array) => void, ink: Ink, order: number, paint: Paint) {
  const mask = new Uint8Array(pixels.length);
  draw(mask);
  paintGlyph(mask, ink, order, paint);
}

function drawChromeLetters() {
  const chrome = { hi: 11, mid: 3, low: 9, edge: 15, shade: 1 };
  const paint: Paint = { shadow: 1, accent: 14, texture: "bands" };
  // r — short ascender, open shoulder, no diagonal capital leg.
  makeGlyph((m) => {
    stroke(m, [[9, 29], [9, 50]], 3.2);
    stroke(m, [[9, 33], [12, 26], [18, 23], [22, 27], [21, 34]], 3.0);
  }, chrome, 0, paint);

  // e — rounded lowercase counter with a deliberately broken lower terminal.
  makeGlyph((m) => {
    arc(m, 34, 37, 9, 12.5, -0.28, Math.PI * 1.78, 2.9);
    stroke(m, [[26, 36], [41, 36]], 2.6);
    stroke(m, [[27, 47], [32, 50], [39, 48]], 2.4);
  }, chrome, 1, paint);

  // a — single-storey bowl with a high right shoulder and undercurl.
  makeGlyph((m) => {
    arc(m, 54, 38, 8, 11.5, 0, Math.PI * 2, 2.8);
    stroke(m, [[62, 27], [62, 49], [66, 51]], 2.8);
    stroke(m, [[49, 50], [56, 52], [63, 48]], 2.0);
  }, chrome, 2, paint);

  // y — twin lowercase arms meeting in a long hooked descender.
  makeGlyph((m) => {
    stroke(m, [[70, 27], [77, 43]], 3.0);
    stroke(m, [[86, 26], [77, 44], [78, 55], [73, 62], [67, 62]], 3.1);
  }, chrome, 3, paint);

  // period.
  makeGlyph((m) => {
    disc(m, 91, 49, 2.8);
  }, chrome, 4, paint);

  // i — unmistakably lowercase, detached dot.
  makeGlyph((m) => {
    stroke(m, [[98, 34], [98, 50]], 3.0);
    disc(m, 98, 25, 3.1);
  }, chrome, 5, paint);

  // o — rounded lowercase terminal with offset interior color cuts.
  makeGlyph((m) => {
    arc(m, 113, 38, 9, 12, 0, Math.PI * 2, 3.1);
  }, chrome, 6, paint);
}

function addChromeFinishingCells() {
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

function drawBotanical() {
  const ink: Ink = { hi: 14, mid: 11, low: 10, edge: 15, shade: 2 };
  const paint: Paint = { shadow: 2, accent: 6, outline: 1.25, texture: "slashes" };

  drawLine([[1, 58], [3, 45], [2, 30], [8, 18], [21, 12]], 0.75, 2);
  drawLine([[125, 58], [120, 44], [121, 30], [114, 17], [101, 11]], 0.75, 3);
  [[3, 42, 1], [2, 33, 1], [8, 22, -1], [15, 15, 1]].forEach(([x, y, f]) => leaf(x, y, f, 10));
  [[118, 42, -1], [120, 33, 1], [114, 22, -1], [108, 14, 1]].forEach(([x, y, f]) => leaf(x, y, f, 3));
  drawLine([[5, 56], [25, 53], [43, 56], [64, 52], [84, 57], [105, 52], [123, 55]], 1.0, 2);
  drawLine([[5, 55], [25, 52], [43, 55], [64, 51], [84, 56], [105, 51], [123, 54]], 0.45, 10);

  makeGlyph((m) => {
    stroke(m, [[10, 31], [9, 50]], 2.5);
    stroke(m, [[9, 35], [13, 27], [20, 24], [23, 29], [21, 34]], 2.3);
    stroke(m, [[8, 49], [4, 54]], 1.5);
  }, ink, 0, paint);
  makeGlyph((m) => {
    arc(m, 34, 38, 9, 11, -0.35, Math.PI * 1.75, 2.35);
    stroke(m, [[26, 37], [42, 36]], 2.1);
    stroke(m, [[29, 48], [36, 51], [43, 47]], 1.75);
  }, ink, 1, paint);
  makeGlyph((m) => {
    arc(m, 54, 39, 8, 10.5, 0, Math.PI * 2, 2.3);
    stroke(m, [[62, 29], [62, 50], [67, 52]], 2.35);
    stroke(m, [[47, 50], [43, 54]], 1.45);
  }, ink, 2, paint);
  makeGlyph((m) => {
    stroke(m, [[69, 29], [77, 44]], 2.5);
    stroke(m, [[86, 28], [77, 44], [78, 55], [73, 62], [65, 64]], 2.55);
    stroke(m, [[73, 62], [82, 59]], 1.5);
  }, ink, 3, paint);
  makeGlyph((m) => disc(m, 91, 50, 2.2), ink, 4, paint);
  makeGlyph((m) => {
    stroke(m, [[98, 35], [98, 50]], 2.35);
    disc(m, 98, 27, 2.4);
  }, ink, 5, paint);
  makeGlyph((m) => arc(m, 114, 39, 9, 11, 0, Math.PI * 2, 2.5), ink, 6, paint);

  leaf(67, 20, 1, 10); leaf(61, 17, -1, 2);
  put(64, 18, 14); put(65, 18, 14); put(64, 19, 6);
}

function drawCircuit() {
  const ink: Ink = { hi: 13, mid: 5, low: 12, edge: 11, shade: 4 };
  const paint: Paint = { shadow: 4, accent: 11, outline: 1.05, texture: "checker" };

  // PCB traces terminate in explicit square pads.
  const traces: Point[][] = [
    [[2, 18], [18, 18], [18, 23]], [[2, 25], [13, 25], [13, 31]],
    [[126, 18], [111, 18], [111, 23]], [[126, 25], [116, 25], [116, 31]],
    [[17, 60], [17, 65], [38, 65]], [[111, 59], [111, 65], [91, 65]],
  ];
  traces.forEach((points, index) => drawLine(points, 0.5, index % 2 ? 5 : 3));
  [[2, 18], [2, 25], [126, 18], [126, 25], [38, 65], [91, 65]].forEach(([x, y], i) => pixelRect(x - 1, y - 1, 3, 3, i % 2 ? 13 : 11));
  for (let x = 5; x < 124; x += 7) {
    if (x % 3) pixelRect(x, 12 + (x % 5), 2, 1, x % 4 ? 8 : 3);
  }
  drawLine([[3, 56], [23, 56], [23, 60], [48, 60], [48, 56], [77, 56], [77, 61], [104, 61], [104, 56], [125, 56]], 0.65, 3);

  makeGlyph((m) => {
    maskRect(m, 7, 28, 6, 23); maskRect(m, 12, 27, 10, 5); maskRect(m, 18, 31, 5, 8);
  }, ink, 0, paint);
  makeGlyph((m) => {
    maskRect(m, 27, 28, 6, 22); maskRect(m, 31, 27, 14, 5);
    maskRect(m, 31, 36, 11, 5); maskRect(m, 31, 46, 14, 5);
  }, ink, 1, paint);
  makeGlyph((m) => {
    maskRect(m, 48, 31, 5, 17); maskRect(m, 52, 27, 12, 5);
    maskRect(m, 59, 31, 6, 20); maskRect(m, 52, 37, 8, 5); maskRect(m, 52, 46, 8, 5);
  }, ink, 2, paint);
  makeGlyph((m) => {
    stroke(m, [[69, 29], [78, 43]], 3.0); stroke(m, [[87, 29], [78, 43], [78, 58], [70, 58]], 3.0);
  }, ink, 3, paint);
  makeGlyph((m) => maskRect(m, 91, 47, 5, 5), ink, 4, paint);
  makeGlyph((m) => {
    maskRect(m, 99, 33, 6, 18); maskRect(m, 99, 25, 6, 5);
  }, ink, 5, paint);
  makeGlyph((m) => {
    maskRect(m, 109, 28, 14, 5); maskRect(m, 107, 31, 6, 17);
    maskRect(m, 119, 31, 6, 17); maskRect(m, 109, 47, 14, 5);
  }, ink, 6, paint);
}

function drawGothicUppercase() {
  const ink: Ink = { hi: 14, mid: 6, low: 12, edge: 15, shade: 4 };
  const paint: Paint = { shadow: 4, accent: 13, outline: 1.35, texture: "slashes" };

  // Cathedral-like spires and a low ornamental rail.
  [12, 33, 54, 75, 96, 117].forEach((x, index) => {
    drawLine([[x, 22], [x, 8 + (index % 2) * 4], [x + 3, 14], [x + 6, 9], [x + 6, 22]], 0.55, index % 2 ? 4 : 8);
    put(x + 3, 10 + (index % 2) * 2, index % 2 ? 13 : 14);
  });
  drawLine([[2, 57], [18, 52], [34, 57], [50, 52], [66, 57], [82, 52], [98, 57], [126, 50]], 1.2, 4);
  drawLine([[2, 55], [18, 50], [34, 55], [50, 50], [66, 55], [82, 50], [98, 55], [126, 48]], 0.55, 14);

  makeGlyph((m) => {
    stroke(m, [[7, 50], [7, 19]], 3.0); arc(m, 14, 29, 8, 9, -Math.PI / 2, Math.PI / 2, 2.8);
    stroke(m, [[13, 36], [23, 51]], 2.8); stroke(m, [[4, 18], [11, 14], [16, 18]], 1.7);
  }, ink, 0, paint);
  makeGlyph((m) => {
    stroke(m, [[29, 19], [29, 50]], 3.0); stroke(m, [[29, 19], [43, 19]], 2.7);
    stroke(m, [[29, 34], [40, 34]], 2.5); stroke(m, [[29, 50], [44, 50]], 2.7);
  }, ink, 1, paint);
  makeGlyph((m) => {
    stroke(m, [[48, 50], [56, 18], [65, 50]], 3.0); stroke(m, [[51, 39], [62, 39]], 2.2);
    stroke(m, [[55, 18], [58, 13], [60, 19]], 1.5);
  }, ink, 2, paint);
  makeGlyph((m) => {
    stroke(m, [[68, 19], [78, 35], [78, 50]], 3.0); stroke(m, [[88, 18], [78, 35]], 3.0);
  }, ink, 3, paint);
  makeGlyph((m) => disc(m, 93, 49, 2.6), ink, 4, paint);
  makeGlyph((m) => {
    stroke(m, [[101, 19], [101, 50]], 3.0); stroke(m, [[96, 19], [106, 19]], 2.2); stroke(m, [[96, 50], [106, 50]], 2.2);
  }, ink, 5, paint);
  makeGlyph((m) => arc(m, 117, 35, 9, 16, 0, Math.PI * 2, 3.0), ink, 6, paint);

  put(63, 8, 15); put(63, 9, 14); put(62, 10, 6); put(64, 10, 6);
}

function drawWaveScript() {
  const ink: Ink = { hi: 15, mid: 11, low: 9, edge: 3, shade: 1 };
  const paint: Paint = { shadow: 1, accent: 10, outline: 1.0, texture: "slashes" };

  // Layered waves and foam are part of the baseline rather than a detached frame.
  drawLine([[0, 56], [14, 51], [27, 56], [42, 50], [57, 56], [72, 49], [88, 56], [104, 50], [128, 55]], 2.2, 9);
  drawLine([[0, 54], [14, 49], [27, 54], [42, 48], [57, 54], [72, 47], [88, 54], [104, 48], [128, 53]], 0.8, 11);
  drawLine([[5, 61], [22, 58], [38, 62], [56, 58], [73, 63], [91, 58], [108, 62], [124, 58]], 0.7, 3);
  [[18, 18], [34, 13], [67, 15], [91, 12], [112, 18]].forEach(([x, y], index) => {
    drawLine([[x - 3, y + 3], [x, y], [x + 3, y + 3]], 0.45, index % 2 ? 11 : 3);
    put(x, y - 2, index % 2 ? 10 : 15);
  });

  makeGlyph((m) => {
    stroke(m, [[3, 47], [10, 47], [10, 30], [13, 23], [20, 24], [23, 30], [21, 35]], 2.25);
  }, ink, 0, paint);
  makeGlyph((m) => {
    arc(m, 34, 38, 9, 11, -0.4, Math.PI * 1.75, 2.25); stroke(m, [[26, 37], [42, 35]], 1.9);
  }, ink, 1, paint);
  makeGlyph((m) => {
    arc(m, 54, 39, 8, 10, 0, Math.PI * 2, 2.2); stroke(m, [[62, 30], [62, 49], [68, 51]], 2.15);
  }, ink, 2, paint);
  makeGlyph((m) => {
    stroke(m, [[69, 30], [77, 44]], 2.35); stroke(m, [[86, 28], [77, 44], [79, 54], [75, 60], [67, 62]], 2.35);
  }, ink, 3, paint);
  makeGlyph((m) => disc(m, 91, 49, 2.15), ink, 4, paint);
  makeGlyph((m) => {
    stroke(m, [[98, 34], [98, 50]], 2.25); disc(m, 98, 26, 2.25);
  }, ink, 5, paint);
  makeGlyph((m) => arc(m, 114, 39, 9, 11, 0, Math.PI * 2, 2.35), ink, 6, paint);
}

function drawBrutalist() {
  const ink: Ink = { hi: 15, mid: 7, low: 8, edge: 12, shade: 4 };
  const paint: Paint = { shadow: 4, accent: 12, outline: 0.9, texture: "solid" };

  // Heavy machine frame and hazard markers.
  drawLine([[2, 20], [2, 13], [30, 13]], 0.7, 8);
  drawLine([[126, 20], [126, 13], [98, 13]], 0.7, 8);
  drawLine([[2, 52], [2, 61], [31, 61]], 0.7, 8);
  drawLine([[126, 52], [126, 61], [98, 61]], 0.7, 8);
  for (let x = 7; x < 122; x += 8) {
    pixelRect(x, 65, 4, 2, x % 16 === 7 ? 12 : 7);
    put(x + 4, 64, 4);
  }
  [12, 116].forEach((x) => {
    pixelRect(x, 18, 2, 3, 12); pixelRect(x + 4, 18, 2, 3, 7);
  });

  makeGlyph((m) => {
    maskRect(m, 7, 27, 7, 24); maskRect(m, 13, 27, 10, 6); maskRect(m, 19, 32, 5, 8);
  }, ink, 0, paint);
  makeGlyph((m) => {
    maskRect(m, 27, 28, 6, 22); maskRect(m, 32, 27, 14, 6);
    maskRect(m, 32, 36, 12, 5); maskRect(m, 32, 46, 15, 5);
  }, ink, 1, paint);
  makeGlyph((m) => {
    maskRect(m, 50, 31, 6, 18); maskRect(m, 55, 27, 11, 6);
    maskRect(m, 61, 31, 6, 20); maskRect(m, 55, 38, 7, 5); maskRect(m, 55, 46, 8, 5);
  }, ink, 2, paint);
  makeGlyph((m) => {
    stroke(m, [[70, 29], [78, 42]], 3.4); stroke(m, [[87, 29], [78, 42], [78, 58], [70, 58]], 3.4);
  }, ink, 3, paint);
  makeGlyph((m) => maskRect(m, 91, 46, 6, 6), ink, 4, paint);
  makeGlyph((m) => {
    maskRect(m, 100, 33, 6, 18); maskRect(m, 100, 25, 6, 5);
  }, ink, 5, paint);
  makeGlyph((m) => {
    maskRect(m, 111, 28, 12, 5); maskRect(m, 108, 31, 6, 17);
    maskRect(m, 120, 31, 6, 17); maskRect(m, 111, 47, 12, 5);
  }, ink, 6, paint);
}

function drawLushGraffiti() {
  const ink: Ink = { hi: 13, mid: 12, low: 5, edge: 14, shade: 4 };
  const paint: Paint = { shadow: 5, accent: 10, outline: 1.65, texture: "checker" };

  // Dense sprayed crown and interwoven lower loop, inspired by scene graffiti lockups.
  drawLine([[8, 24], [17, 15], [29, 18], [38, 10], [50, 16], [64, 8], [77, 16], [91, 11], [103, 18], [119, 13]], 1.15, 2);
  drawLine([[10, 25], [18, 17], [29, 20], [39, 12], [50, 18], [64, 10], [77, 18], [91, 13], [103, 20], [118, 15]], 0.5, 10);
  [14, 27, 43, 58, 75, 93, 110].forEach((x, index) => leaf(x, 16 + (index % 3) * 2, index % 2 ? -1 : 1, index % 2 ? 10 : 2));
  drawLine([[1, 58], [20, 53], [39, 60], [58, 52], [78, 61], [98, 53], [127, 58]], 2.0, 5);
  drawLine([[1, 56], [20, 51], [39, 58], [58, 50], [78, 59], [98, 51], [127, 56]], 0.8, 14);

  makeGlyph((m) => {
    stroke(m, [[8, 29], [8, 51]], 3.0); stroke(m, [[8, 34], [13, 25], [21, 24], [24, 29], [22, 35]], 2.8);
  }, ink, 0, paint);
  makeGlyph((m) => {
    arc(m, 35, 38, 10, 12, -0.32, Math.PI * 1.78, 2.8); stroke(m, [[26, 37], [43, 36]], 2.5);
  }, ink, 1, paint);
  makeGlyph((m) => {
    arc(m, 55, 39, 8.5, 11, 0, Math.PI * 2, 2.75); stroke(m, [[63, 28], [63, 50], [68, 53]], 2.75);
  }, ink, 2, paint);
  makeGlyph((m) => {
    stroke(m, [[70, 28], [78, 44]], 2.9); stroke(m, [[87, 27], [78, 44], [80, 55], [74, 63], [66, 64]], 2.9);
  }, ink, 3, paint);
  makeGlyph((m) => disc(m, 92, 50, 2.5), ink, 4, paint);
  makeGlyph((m) => {
    stroke(m, [[99, 34], [99, 50]], 2.7); disc(m, 99, 25, 2.8);
  }, ink, 5, paint);
  makeGlyph((m) => arc(m, 115, 39, 9, 11, 0, Math.PI * 2, 2.85), ink, 6, paint);
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

export function renderAnsiLogo(element: HTMLElement, design = 1) {
  pixels.fill(0);
  switch (design) {
    case 2:
      drawBotanical();
      break;
    case 3:
      drawCircuit();
      break;
    case 4:
      drawGothicUppercase();
      break;
    case 5:
      drawWaveScript();
      break;
    case 6:
      drawLushGraffiti();
      break;
    default:
      drawChromeBackground();
      drawChromeLetters();
      addChromeFinishingCells();
  }
  element.innerHTML = toAnsiHtml();
}
