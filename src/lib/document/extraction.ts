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

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const strings = textContent.items.map((item: any) => item.str);
      const text = strings.join(" ");
      pages.push({ pageNumber: i, text });
      totalCharacters += text.replace(/\s+/g, "").length;
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
