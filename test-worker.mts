import url from "url";
import { createRequire } from "module";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const require = createRequire(import.meta.url);
const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
pdfjs.GlobalWorkerOptions.workerSrc = url.pathToFileURL(workerPath).href;

console.log("Worker URL:", pdfjs.GlobalWorkerOptions.workerSrc);

// Just try to get fake document to see if it triggers worker load without crashing
try {
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array([0,1,2]) });
  await loadingTask.promise.catch(() => {});
  console.log("Success setting up!");
} catch (e: any) {
  console.log("Error during setup:", e.message);
}
