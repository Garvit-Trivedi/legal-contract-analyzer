/**
 * Builds a full-content DOCX from extracted plain text, embedding
 * real OpenXML tracked changes (<w:del> / <w:ins>) at the exact location(s)
 * of the proposed edits.
 *
 * Used for:
 *  - PDF documents (no editable XML — we reconstruct a complete DOCX from extracted text)
 *  - DOCX documents where the original binary was not stored (fallback)
 *
 * The output contains the ENTIRE document text, not just the changed lines.
 */

interface EditEntry {
  originalText: string;
  replacementText: string;
  instruction: string;
  reason?: string | null;
}

export function buildFullDocxWithRedlines(
  originalFilename: string,
  fullText: string,
  edits: EditEntry[]
): Buffer {
  const author = "Legal Contract Analyzer";
  const ts = new Date().toISOString();

  // Split the extracted text into paragraphs (preserve blank-line separations)
  const rawParagraphs = fullText.split(/\r?\n/);

  // Build a mutable working array of "segments" per paragraph
  // Each segment is either { type:'text', content } or { type:'change', del, ins }
  type TextSeg = { type: "text"; content: string };
  type ChangeSeg = { type: "change"; del: string; ins: string; revDel: number; revIns: number };
  type Segment = TextSeg | ChangeSeg;

  let revCounter = 2000;

  // We process the WHOLE extracted text as one string so that edits spanning
  // a paragraph boundary (rare but possible with PDF extraction) still work.
  // Strategy: apply each edit sequentially on the full string, splitting into
  // an ordered list of {plain | change} spans.

  interface Span {
    kind: "plain" | "change";
    content: string;          // for plain
    del?: string;             // for change
    ins?: string;             // for change
    revDel?: number;
    revIns?: number;
  }

  let spans: Span[] = [{ kind: "plain", content: fullText }];

  for (const edit of edits) {
    if (!edit.originalText || !edit.replacementText) continue;

    const newSpans: Span[] = [];
    for (const span of spans) {
      if (span.kind === "change") {
        // Already-changed spans are immutable
        newSpans.push(span);
        continue;
      }

      const idx = span.content.indexOf(edit.originalText);
      if (idx === -1) {
        newSpans.push(span);
        continue;
      }

      const before = span.content.slice(0, idx);
      const after = span.content.slice(idx + edit.originalText.length);

      if (before) newSpans.push({ kind: "plain", content: before });
      newSpans.push({
        kind: "change",
        content: "",
        del: edit.originalText,
        ins: edit.replacementText,
        revDel: revCounter++,
        revIns: revCounter++,
      });
      if (after) newSpans.push({ kind: "plain", content: after });
    }
    spans = newSpans;
  }

  // Now split each span by newline and build paragraph XML
  // Re-join spans that belong to the same paragraph line
  interface LineToken {
    kind: "plain" | "change" | "newline";
    content?: string;
    del?: string;
    ins?: string;
    revDel?: number;
    revIns?: number;
  }

  const lineTokens: LineToken[] = [];
  for (const span of spans) {
    if (span.kind === "plain") {
      const lines = span.content.split(/\r?\n/);
      lines.forEach((line, i) => {
        if (i > 0) lineTokens.push({ kind: "newline" });
        lineTokens.push({ kind: "plain", content: line });
      });
    } else {
      lineTokens.push({ kind: "change", del: span.del, ins: span.ins, revDel: span.revDel, revIns: span.revIns });
    }
  }

  // Group tokens into paragraphs, split on newline tokens
  const paragraphGroups: LineToken[][] = [];
  let current: LineToken[] = [];
  for (const t of lineTokens) {
    if (t.kind === "newline") {
      paragraphGroups.push(current);
      current = [];
    } else {
      current.push(t);
    }
  }
  if (current.length > 0) paragraphGroups.push(current);

  // Build XML for each paragraph
  function xmlEsc(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function makeRun(text: string): string {
    if (!text) return "";
    return `<w:r><w:t xml:space="preserve">${xmlEsc(text)}</w:t></w:r>`;
  }

  function makeDelRun(text: string, rId: number): string {
    return `<w:del w:id="${rId}" w:author="${xmlEsc(author)}" w:date="${ts}"><w:r><w:rPr><w:color w:val="FF0000"/></w:rPr><w:delText xml:space="preserve">${xmlEsc(text)}</w:delText></w:r></w:del>`;
  }

  function makeInsRun(text: string, rId: number): string {
    return `<w:ins w:id="${rId}" w:author="${xmlEsc(author)}" w:date="${ts}"><w:r><w:rPr><w:color w:val="00AA00"/></w:rPr><w:t xml:space="preserve">${xmlEsc(text)}</w:t></w:r></w:ins>`;
  }

  let paraXml = "";
  for (const group of paragraphGroups) {
    let runs = "";
    for (const tok of group) {
      if (tok.kind === "plain") {
        runs += makeRun(tok.content || "");
      } else if (tok.kind === "change") {
        runs += makeDelRun(tok.del || "", tok.revDel!);
        runs += makeInsRun(tok.ins || "", tok.revIns!);
      }
    }
    // Detect heading-like lines (ALL CAPS or short, no punctuation at end)
    const rawText = group.map(t => t.kind === "plain" ? (t.content || "") : ((t.del || "") + (t.ins || ""))).join("");
    const isHeading = rawText.length > 0 && rawText.length < 80 && rawText === rawText.toUpperCase() && /^[A-Z0-9 .,'-]+$/.test(rawText.trim());
    const style = isHeading ? `<w:pPr><w:pStyle w:val="Heading2"/></w:pPr>` : "";
    paraXml += `<w:p>${style}${runs}</w:p>\n`;
  }

  // Minimal title paragraph
  const titleXml = `<w:p>
    <w:pPr><w:pStyle w:val="Title"/></w:pPr>
    <w:r><w:t>${xmlEsc(originalFilename.replace(/\.(pdf|docx|txt)$/i, ""))}</w:t></w:r>
  </w:p>
  <w:p>
    <w:r><w:rPr><w:color w:val="888888"/><w:sz w:val="18"/></w:rPr>
      <w:t xml:space="preserve">Redlined on ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} — Legal Contract Analyzer</w:t>
    </w:r>
  </w:p>
  <w:p/>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"
  mc:Ignorable="w14 w15">
  <w:body>
    ${titleXml}
    ${paraXml}
    <w:sectPr/>
  </w:body>
</w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AdmZip = require("adm-zip");
  const zip = new AdmZip();
  zip.addFile("[Content_Types].xml", Buffer.from(contentTypes, "utf8"));
  zip.addFile("_rels/.rels", Buffer.from(rels, "utf8"));
  zip.addFile("word/document.xml", Buffer.from(documentXml, "utf8"));
  zip.addFile("word/_rels/document.xml.rels", Buffer.from(wordRels, "utf8"));

  return zip.toBuffer();
}
