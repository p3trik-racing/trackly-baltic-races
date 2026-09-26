Use `src/components/Logo.tsx` for inline, theme-colored brand marks; keep the matching SVG assets under `public/` for direct use, because external SVG images cannot inherit the app's text color.
Keep share-image and page URL metadata in leaf route heads, not the root head, so each page owns its preview; the home share image is the rasterized `public/og.png` based on LogoFull.
- MapLibre map (src/components/EventsMap.tsx) is lazy-loaded behind ClientOnly because its WebGL and DOM APIs require a browser.
- UI copy lives in `src/i18n/en.ts` (flat dotted keys) and is read via `useLang().t()` from `src/i18n/index.tsx`; ru/lv are partial and fall back to EN — keeps all languages in one no-dependency system.
- MapLibre uses OpenFreeMap vector dark/positron styles for crisp, key-free map tiles in both themes.
