# `client/index.html` — fonts

Replace the Cinzel / Crimson Pro link with:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
  rel="stylesheet"
/>
```

Nothing else in the file changes. The header markup (`#topbar`, `.brand`, `.mark`,
`.brand-sub`, `#nav`) is already what the new stylesheet expects.
