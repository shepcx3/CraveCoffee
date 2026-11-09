# CRAVE Coffee House & Bakery — website

Static website for CRAVE Coffee House & Bakery, 166 Princess St, Kingston, ON.

## Run locally

No build step. Serve the folder with any static server (ES modules need http, not `file://`):

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Structure

```
index.html              page markup + SEO / schema.org data
assets/css/styles.css   all styles
assets/js/cup.js        the spinning 3D CRAVE cup (Three.js, vendored in assets/js/vendor)
assets/js/main.js       nav, live open/closed status, menu rendering, scroll effects
assets/js/menu-data.js  ← THE MENU. Fill this in to publish it.
assets/img/             photos + logo
```

## Adding the menu

Open `assets/js/menu-data.js` and add categories/items (example is in the file).
While the list is empty, the site shows a "menu coming soon" panel.

## Deploy

Upload the whole folder to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages).
