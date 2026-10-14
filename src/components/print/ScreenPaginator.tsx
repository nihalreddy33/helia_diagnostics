"use client";

import { useLayoutEffect, useRef } from "react";

// A4 geometry in mm; px values are derived from the sheet's rendered width so
// they stay correct whatever the A4Frame scale is.
const PAGE_MM = 297;
const WIDTH_MM = 210;
const HEAD_MM = 26; // must match .print-head-space
const FOOT_MM = 30; // must match .print-foot-space

const GAP_CLASS = "screen-page-gap";

/**
 * On screen, the letterhead tiles once per A4 height but content flows
 * continuously, so without help a long report's text runs straight across a
 * footer bar and the next page's logo. Print doesn't have this problem — the
 * browser repeats the <thead>/<tfoot> bands on every page — so this emulates
 * the same thing for the preview: it measures every result row and block in
 * the body and, wherever one would cross into a footer band, inserts a gap that
 * pushes it to the top of the next page's content area. The gaps are hidden in
 * print (globals.css), where the real pagination takes over.
 *
 * Renders nothing itself; it operates on the enclosing .print-sheet.
 */
export function ScreenPaginator() {
  const anchor = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const sheet = anchor.current?.closest<HTMLElement>(".print-sheet");
    const body = sheet?.querySelector<HTMLElement>(".print-body");
    if (!sheet || !body) return;

    let lastPlan = "";
    let frame = 0;

    const paginate = () => {
      frame = 0;
      // Start from a clean sheet so measurements aren't skewed by old gaps.
      sheet.querySelectorAll(`.${GAP_CLASS}`).forEach((g) => g.remove());
      sheet.style.minHeight = "";

      // Unscaled px per mm, from the sheet's own layout width (210mm).
      const pxPerMm = sheet.offsetWidth / WIDTH_MM;
      const page = PAGE_MM * pxPerMm;
      const head = HEAD_MM * pxPerMm;
      const foot = FOOT_MM * pxPerMm;
      // getBoundingClientRect is post-transform (A4Frame scales the sheet);
      // divide by the scale to get back to layout px.
      const sheetRect = sheet.getBoundingClientRect();
      const scale = sheetRect.width / sheet.offsetWidth || 1;

      // Breakable units: table rows, and non-table blocks directly in the body
      // or one level down (sections hold paragraphs; the results table holds rows).
      const units: HTMLElement[] = [];
      for (const el of body.querySelectorAll<HTMLElement>("tr")) units.push(el);
      for (const child of Array.from(body.children) as HTMLElement[]) {
        if (child.tagName === "TABLE" || child.querySelector("table")) {
          // Its rows are already units; still take any non-table blocks inside it.
          for (const sub of Array.from(child.children) as HTMLElement[]) {
            if (sub.tagName !== "TABLE" && !sub.querySelector("table")) units.push(sub);
          }
        } else if (child.children.length > 1 && child.offsetHeight > page / 4) {
          for (const sub of Array.from(child.children) as HTMLElement[]) units.push(sub);
        } else {
          units.push(child);
        }
      }
      const top = (el: HTMLElement) => (el.getBoundingClientRect().top - sheetRect.top) / scale;
      units.sort((a, b) => top(a) - top(b));

      const plan: { el: HTMLElement; gap: number }[] = [];
      let pageIndex = 0;
      // Simulated running offset: layout positions shift as gaps are inserted,
      // so track the cumulative shift rather than re-measuring after each one.
      let shift = 0;
      for (const el of units) {
        const h = el.getBoundingClientRect().height / scale;
        if (h <= 0) continue;
        const t = top(el) + shift;
        const limit = (pageIndex + 1) * page - foot;
        if (t + h > limit && h < page - head - foot) {
          const nextTop = (pageIndex + 1) * page + head;
          // Gap heights are fractional and row heights round, so a bare
          // difference can leave the row a pixel inside the band; round up and
          // add a little clearance.
          const gap = Math.ceil(nextTop - t) + 2;
          plan.push({ el, gap });
          shift += gap;
          pageIndex += 1;
        }
        // Advance pageIndex if a tall unit straddled multiple pages anyway.
        while (t + h > (pageIndex + 1) * page) pageIndex += 1;
      }
      const totalPages = Math.max(1, Math.ceil((body.getBoundingClientRect().height / scale + shift + head + foot) / page));

      const signature = plan.map((p) => `${units.indexOf(p.el)}:${Math.round(p.gap)}`).join("|") + `#${totalPages}`;
      if (signature === lastPlan && plan.length === 0) return;
      lastPlan = signature;

      for (const { el, gap } of plan) {
        if (el.tagName === "TR") {
          const cols = Array.from(el.children).reduce((n, c) => n + ((c as HTMLTableCellElement).colSpan || 1), 0);
          const tr = document.createElement("tr");
          tr.className = GAP_CLASS;
          const td = document.createElement("td");
          td.colSpan = cols || 1;
          td.style.cssText = `height:${gap}px;padding:0;border:0;`;
          tr.appendChild(td);
          el.parentElement?.insertBefore(tr, el);
        } else {
          const div = document.createElement("div");
          div.className = GAP_CLASS;
          div.style.cssText = `height:${gap}px;`;
          el.parentElement?.insertBefore(div, el);
        }
      }
      // Pad the sheet to a whole number of pages so the last page's footer
      // artwork sits at the bottom of the tile rather than mid-air.
      sheet.style.minHeight = `${totalPages * page}px`;
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(paginate);
    };

    paginate();
    const ro = new ResizeObserver(schedule);
    ro.observe(sheet);
    // Fonts/images landing later change heights; re-run once they're ready.
    document.fonts?.ready.then(schedule).catch(() => {});
    return () => {
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <span ref={anchor} hidden />;
}
