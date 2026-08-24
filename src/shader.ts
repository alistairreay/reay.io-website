const vertexSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform vec2 u_pointer;
  uniform float u_time;
  uniform float u_seed;
  uniform float u_theme;
  uniform vec3 u_colorA;
  uniform vec3 u_colorB;
  uniform vec3 u_colorC;
  uniform vec3 u_colorD;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32 + u_seed);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    mat2 rotation = mat2(0.80, -0.60, 0.60, 0.80);
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p = rotation * p * 2.03 + 7.17;
      amplitude *= 0.49;
    }
    return value;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 p = uv - 0.5;
    p.x *= u_resolution.x / u_resolution.y;
    float t = u_time * 0.055;
    vec2 pointer = (u_pointer - 0.5) * vec2(0.35, 0.22);
    float warpA = fbm(p * 1.6 + vec2(t, -t * 0.7) + pointer);
    float warpB = fbm(p * 2.15 + vec2(-t * 0.8, t) - pointer + warpA * 0.9);
    float field = fbm(p * 1.12 + vec2(warpA, warpB) * 1.25 + t * 0.22);
    float ribbonA = 0.5 + 0.5 * sin(field * 8.5 + p.x * 2.0 - t * 2.0);
    float ribbonB = 0.5 + 0.5 * cos(warpB * 9.0 - p.y * 3.0 + t * 1.4);
    vec3 color = mix(u_colorA, u_colorB, smoothstep(0.08, 0.92, ribbonA));
    color = mix(color, u_colorC, smoothstep(0.28, 0.9, ribbonB) * 0.72);
    color = mix(color, u_colorD, smoothstep(0.52, 0.98, field) * 0.48);
    float center = 1.0 - smoothstep(0.05, 0.92, length(p * vec2(0.78, 1.0)));
    float halo = exp(-3.1 * length(p - pointer * 0.35));
    float lightLevel = mix(0.20, 0.88, u_theme);
    vec3 base = vec3(lightLevel);
    float strength = mix(0.22, 0.12, u_theme) + center * mix(0.27, 0.16, u_theme) + halo * 0.08;
    color = mix(base, color, strength);
    float grain = (hash(gl_FragCoord.xy + mod(u_time, 100.0)) - 0.5) * 0.025;
    gl_FragColor = vec4(color + grain, 1.0);
  }
`;

type Theme = "light" | "dark";

function hslToRgb(hue: number, saturation = 0.83, lightness = 0.61) {
  const h = hue / 360;
  const hueToRgb = (p: number, q: number, t: number) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };
  const q = lightness < 0.5
    ? lightness * (1 + saturation)
    : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  return new Float32Array([
    hueToRgb(p, q, h + 1 / 3),
    hueToRgb(p, q, h),
    hueToRgb(p, q, h - 1 / 3),
  ]);
}

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export class OpalescentShader {
  private gl: WebGLRenderingContext | null;
  private program: WebGLProgram | null = null;
  private animationFrame = 0;
  private startTime = performance.now();
  private pointer = [0.5, 0.5];
  private theme: Theme = "dark";
  private resizeObserver: ResizeObserver | null = null;
  private animate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor(
    private canvas: HTMLCanvasElement,
    palette: number[],
    private seed: number,
  ) {
    this.gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
    });
    if (!this.gl) return;

    const vertex = createShader(this.gl, this.gl.VERTEX_SHADER, vertexSource);
    const fragment = createShader(this.gl, this.gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) return;

    this.program = this.gl.createProgram();
    if (!this.program) return;
    this.gl.attachShader(this.program, vertex);
    this.gl.attachShader(this.program, fragment);
    this.gl.linkProgram(this.program);
    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) return;
    this.gl.useProgram(this.program);

    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      this.gl.STATIC_DRAW,
    );
    const position = this.gl.getAttribLocation(this.program, "a_position");
    this.gl.enableVertexAttribArray(position);
    this.gl.vertexAttribPointer(position, 2, this.gl.FLOAT, false, 0, 0);

    ["A", "B", "C", "D"].forEach((name, index) => {
      this.gl?.uniform3fv(
        this.gl.getUniformLocation(this.program!, `u_color${name}`),
        hslToRgb(palette[index]),
      );
    });
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_seed"), seed * 100);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    if (this.animate) {
      this.animationFrame = requestAnimationFrame(this.render);
    } else {
      this.render(performance.now());
    }
  }

  setTheme(theme: Theme) {
    this.theme = theme;
  }

  setPointer(x: number, y: number) {
    this.pointer = [x / window.innerWidth, 1 - y / window.innerHeight];
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.canvas.width = Math.floor(this.canvas.clientWidth * dpr);
    this.canvas.height = Math.floor(this.canvas.clientHeight * dpr);
    this.gl?.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private render = (now: number) => {
    if (!this.gl || !this.program) return;
    this.gl.useProgram(this.program);
    this.gl.uniform2f(this.gl.getUniformLocation(this.program, "u_resolution"), this.canvas.width, this.canvas.height);
    this.gl.uniform2f(this.gl.getUniformLocation(this.program, "u_pointer"), this.pointer[0], this.pointer[1]);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_time"), (now - this.startTime) / 1000);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_theme"), this.theme === "light" ? 1 : 0);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    if (this.animate) this.animationFrame = requestAnimationFrame(this.render);
  };

  destroy() {
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver?.disconnect();
  }
}
