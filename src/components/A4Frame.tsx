"use client";

import { useEffect, useRef, useState } from "react";

// A4 width at 96dpi (210mm). The .print-sheet inside is sized in mm to match.
const A4_WIDTH_PX = 794;

/**
 * Renders a fixed-width A4 sheet (with letterhead) and scales it down to fit
 * narrow screens, so a phone shows the whole letterhead page without horizontal
 * scrolling. Printing resets the scale (see globals.css) so it prints true A4.
 */
export function A4Frame({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const update = () => {
      const avail = outer.clientWidth;
      const s = Math.min(1, avail / A4_WIDTH_PX);
      setScale(s);
      // Reserve the scaled height so the page doesn't leave a gap below.
      setHeight(inner.offsetHeight * s);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="a4-frame" style={height ? { height } : undefined}>
      <div
        ref={innerRef}
        className="a4-inner"
        style={{ width: A4_WIDTH_PX, transform: `scale(${scale})`, transformOrigin: "top left" }}
      >
        {children}
      </div>
    </div>
  );
}
