# reay.io

A full-viewport, static placeholder for `reay.io`, built with hand-drawn ANSI-style lettering, a WebGL opalescent shader, responsive 3D depth, and persistent light/dark themes.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The static site is emitted to `dist/`. Pushes to `main` are automatically built and published with GitHub Pages. The custom domain is declared in `public/CNAME`.

Six static ANSI compositions are available through `?design=1` to `?design=6`. The default is design 1; designs 1–3 and 5–6 are lowercase, while design 4 is consistently uppercase.
