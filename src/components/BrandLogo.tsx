"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders the Helia Diagnostics logo from /public/helia-logo.png. Until that
 * asset exists (or if it fails to load) it falls back to a styled monogram so
 * the UI never shows a broken image.
 *
 * Drop the artwork at `public/helia-logo.png` (or .svg and update `src`) and it
 * appears automatically — no code change required.
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

  // Fallback monogram + wordmark in brand colors.
  if (variant === "hero") {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white">
          H
        </span>
        <span className="mt-2 text-xl font-extrabold tracking-tight text-brand-700">
          HELIA <span className="font-semibold text-slate-500">DIAGNOSTIC</span>
        </span>
      </div>
    );
  }

  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
        H
      </span>
      <span className="text-base font-extrabold tracking-tight text-brand-700">
        HELIA <span className="font-semibold text-slate-500">DIAGNOSTIC</span>
      </span>
    </span>
  );
}
