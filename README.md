# reay.io

A full-viewport, static placeholder for `reay.io` featuring custom ANSI artwork and a responsive spectral treatment on a seamless black canvas.

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

The original ANSI file is published alongside its pixel-perfect rendered image at `public/chrome.ans` and `public/chrome.png`.
