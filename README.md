# For Kashish 🎀

A static birthday site — plain HTML, CSS and JS. No build step, no dependencies.

**Live:** https://prakhar2706.github.io/kashish-bday/

## Run locally
```bash
python3 -m http.server 8899
```
Then open http://localhost:8899

## Editing the content
Everything you'd want to change lives in **`js/content.js`** — name, birthday,
hero lines, photo captions, the Chapter 2 timeline, the 10 reasons, and the
Chapter 5 letter. Nothing else needs touching.

- **Photos**: `assets/photos/p01.jpg` … `p26.jpg`. Each entry takes an optional
  `pos: "50% 30%"` (CSS `object-position`) to control the crop when a face sits
  high or low in the frame.
- **Music**: `assets/audio/dreamy-loop.wav`. To swap it, drop a new file in
  `assets/audio/` and update the `<audio>` `src` in `index.html`. If the file is
  ever missing, the site falls back to a synthesised melody in the browser.

## Publishing on GitHub Pages
Already set up at https://prakhar2706.github.io/kashish-bday/ — every push to `main`
redeploys automatically.

To set this up on a fresh repo:
1. Push this folder as the repo root.
2. Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/`.
3. `.nojekyll` is already here so `assets/` is served as-is.
