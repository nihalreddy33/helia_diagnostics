/**
 * An A4 sheet on the Helia letterhead, for every printed document.
 *
 * The artwork has to appear on every page of a long report, with the content
 * kept out of its header and footer bands on every page — not just the first.
 * Two browser behaviours make that work without any pagination logic:
 *
 *  - In print, a `position: fixed` element is repeated on every page, so the
 *    letterhead <img> is fixed and full-bleed there (see globals.css). On
 *    screen it is hidden and the sheet's background tiles the artwork once per
 *    A4 height instead, so a long report previews as consecutive pages.
 *  - Browsers repeat a table's <thead> and <tfoot> on every printed page, so
 *    an empty header row the height of the header band, and a footer row the
 *    height of the footer band, reserve those zones on each page. Content
 *    lives in the single <tbody> row and flows across pages between them.
 *
 * The previous single absolutely-positioned image was sized to the sheet, so a
 * report longer than one page stretched the artwork taller than A4 and pushed
 * the logo band down over the patient details.
 */
import { ScreenPaginator } from "./ScreenPaginator";

export function LetterheadSheet({ children }: { children: React.ReactNode }) {
  return (
    <article className="print-sheet">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="letterhead print-letterhead" src="/letterhead.png" alt="" aria-hidden="true" />
      <table className="print-table">
        <thead>
          <tr>
            <td>
              <div className="print-head-space" />
            </td>
          </tr>
        </thead>
        <tfoot>
          <tr>
            <td>
              <div className="print-foot-space" />
            </td>
          </tr>
        </tfoot>
        <tbody>
          <tr>
            <td>
              <div className="print-body">{children}</div>
              {/* On screen only: inserts page-break gaps so the continuous
                  preview never lays content over a footer or header band.
                  Print hides them and paginates with the thead/tfoot above. */}
              <ScreenPaginator />
            </td>
          </tr>
        </tbody>
      </table>
    </article>
  );
}
