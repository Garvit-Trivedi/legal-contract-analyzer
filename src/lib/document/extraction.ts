import mammoth from "mammoth";

export interface ExtractedPage {
  pageNumber: number | null;
  text: string;
}

export interface ExtractionResult {
  pages: ExtractedPage[];
  totalCharacters: number;
}

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtractionError";
  }
}

export async function extractTextFromFile(
  buffer: Buffer,
  fileType: string
): Promise<ExtractionResult> {
  if (fileType === "application/pdf" || fileType === "pdf") {
    return extractPdf(buffer);
  } else if (
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileType === "docx"
  ) {
    return extractDocx(buffer);
  } else if (fileType === "text/plain" || fileType === "txt") {
    return extractTxt(buffer);
  } else {
    throw new ExtractionError(`Unsupported file type: ${fileType}`);
  }
}

async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const path = await import("path");
  const url = await import("url");

  // Securely resolve the node_modules location using an absolute server file URI.
  // This bypasses Turbopack interception while fully satisfying the Node.js Fake Worker import.
  const workerPath = path.resolve(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = url.pathToFileURL(workerPath).href;
  
  // We can explicitly disable Font loading warnings or use systemic standard if passing standardFontDataUrl
  // For basic text extraction, we bypass most canvas-related features.
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({
    data: uint8Array,
    useSystemFonts: true,
    disableFontFace: true,
  });

  try {
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const pages: ExtractedPage[] = [];
    let totalCharacters = 0;

    // Extract pages in concurrent batches to drastically improve speed for large documents
    // Batched securely and yielded microscopically to prevent V8 CPU locking which crashes Next.js sockets
    const BATCH_SIZE = 10;
    for (let start = 1; start <= numPages; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE - 1, numPages);
      const pagePromises = [];
      
      for (let i = start; i <= end; i++) {
        pagePromises.push((async () => {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Micro-yield to node event loop during heavy text map
          await new Promise(resolve => setTimeout(resolve, 0));
          
          const strings = textContent.items.map((item: any) => item.str);
          const text = strings.join(" ");
          return { pageNumber: i, text, length: text.replace(/\s+/g, "").length };
        })());
      }
      
      const results = await Promise.all(pagePromises);
      for (const res of results) {
        pages.push({ pageNumber: res.pageNumber, text: res.text });
        totalCharacters += res.length;
      }
      
      // Explicit macro-yield between batches so Next.js HTTP server ping doesn't time out
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    if (numPages > 0 && totalCharacters < 50) {
      throw new ExtractionError(
        "This PDF does not contain extractable text. It may be a scanned or image-only PDF. Please upload a text-based PDF."
      );
    }

    return { pages, totalCharacters };
  } catch (err: any) {
    if (err instanceof ExtractionError) throw err;
    throw new ExtractionError(`Failed to parse PDF: ${err.message || err}`);
  }
}

async function extractDocx(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    const extractableChars = text.replace(/\s+/g, "").length;
    if (extractableChars === 0) {
      throw new ExtractionError("This DOCX document appears to be empty.");
    }
    // Mammoth doesn't give us page numbers, so we use null
    return {
      pages: [{ pageNumber: null, text }],
      totalCharacters: extractableChars,
    };
  } catch (err: any) {
    if (err instanceof ExtractionError) throw err;
    throw new ExtractionError(`Failed to parse DOCX: ${err.message || err}`);
  }
}

async function extractTxt(buffer: Buffer): Promise<ExtractionResult> {
  const text = buffer.toString("utf-8");
  const extractableChars = text.replace(/\s+/g, "").length;
  if (extractableChars === 0) {
    throw new ExtractionError("This TXT document appears to be empty.");
  }
  return {
    pages: [{ pageNumber: null, text }],
    totalCharacters: extractableChars,
  };
}
