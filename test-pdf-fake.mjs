import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function run() {
  pdfjs.GlobalWorkerOptions.workerSrc = ""; // Disable worker
  // Or force standard fonts
  const uint8 = new Uint8Array(fs.readFileSync('hiring assignment.pdf'));
  const loadingTask = pdfjs.getDocument({
    data: uint8,
    useSystemFonts: true,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const text = await page.getTextContent();
  console.log(text.items.slice(0, 5));
}
run().catch(console.error);
