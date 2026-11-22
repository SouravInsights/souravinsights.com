import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCVData } from "../actions";
import { CVDocument } from "./CVDocument";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Streams the CV as a PDF, rendered from the same live data the page shows.
 * The layout mirrors the PDF kept in the local cv/ dir, so the download is always
 * in sync with whatever is currently saved in the CV editor.
 */
export async function GET() {
  const data = await getCVData();

  const element = createElement(CVDocument, { data }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(element);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="sourav-nanda-cv.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
