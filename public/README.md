# Static assets

Place the Helia Diagnostics logo here as **`helia-logo.png`** (a transparent PNG,
ideally ~600px tall, or export an `.svg` and update the `src` in
`src/components/BrandLogo.tsx`).

`BrandLogo` references `/helia-logo.png`. Until the file exists it falls back to
a styled monogram, so the UI is never broken — the real artwork appears
automatically once the file is added.
