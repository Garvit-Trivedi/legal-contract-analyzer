import path from "path";
import { pathToFileURL } from "url";

export async function extractPdf(buffer: Buffer): Promise<any> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  
  // Set workerSrc to a valid file:// URI natively resolvable by Node.js.
  // This bypasses Turbopack's bundled module resolution for the Fake Worker.
  const workerPath = path.resolve(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({
    data: uint8Array,
    useSystemFonts: true,
    disableFontFace: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pages: any[] = [];
  let totalCharacters = 0;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const strings = textContent.items.map((item: any) => item.str);
    const text = strings.join(" ");
    pages.push({ pageNumber: i, text });
    totalCharacters += text.replace(/\s+/g, "").length;
  }

  return { pages, totalCharacters };
}
