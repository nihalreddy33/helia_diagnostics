"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Helia mark: green medical cross, indigo "H" uprights, amber lab droplet.
 * Matches src/app/icon.svg (the favicon).
 */
function HeliaMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} role="img" aria-label="Helia Diagnostics">
      <rect x="40" y="6" width="16" height="84" rx="8" fill="#52b52c" />
      <rect x="6" y="40" width="84" height="16" rx="8" fill="#52b52c" />
      <rect x="19" y="17" width="13" height="62" rx="6" fill="#351f83" />
      <rect x="64" y="17" width="13" height="62" rx="6" fill="#351f83" />
      <circle cx="48" cy="48" r="13" fill="#ffffff" />
      <path d="M48 40 C41.5 47.5 42.5 55 48 55 C53.5 55 54.5 47.5 48 40 Z" fill="#f5a623" />
      <circle cx="58" cy="39" r="2.2" fill="#f5a623" />
      <circle cx="62.5" cy="34" r="1.6" fill="#52b52c" />
    </svg>
  );
}

/**
 * Renders the Helia Diagnostics logo. Prefers the artwork at
 * `/public/helia-logo.png` when present; otherwise draws the brand mark +
 * wordmark inline so the UI always looks right (no broken image, no external
 * asset required).
 *
 * To use the exact supplied logo, drop it at `public/helia-logo.png`.
 */
export function BrandLogo({
  variant = "header",
  className = "",
}: {
  variant?: "header" | "hero";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const imgHeight = variant === "hero" ? "h-20" : "h-9";

  // If the image 404s before hydration, onError never fires — detect it here.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (!failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={ref}
        src="/helia-logo.png"
        alt="Helia Diagnostics"
        className={`${imgHeight} w-auto ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }

  if (variant === "hero") {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <HeliaMark className="h-16 w-16" />
        <span className="mt-2 text-2xl font-extrabold uppercase leading-none tracking-tight text-brand-700">
          Helia
        </span>
        <span className="mt-1 text-sm font-semibold uppercase tracking-[0.35em] text-slate-800">
          Diagnostics
        </span>
      </div>
    );
  }

  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <HeliaMark className="h-9 w-9" />
      <span className="flex flex-col leading-none">
        <span className="text-base font-extrabold uppercase tracking-tight text-brand-700">
          Helia
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-700">
          Diagnostics
        </span>
      </span>
    </span>
  );
}
