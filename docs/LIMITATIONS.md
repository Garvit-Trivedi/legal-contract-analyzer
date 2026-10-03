# ⚠️ System Limitations & Workarounds

While the Legal Contract Analyzer implements strict edge-case catching (such as zero-hallucination verification interceptors), the following fundamental architectural boundaries exist out-of-the-box. 

---

## 1. Scanner & Optical Image Processing (OCR)

| Constraint Level | Component | Description |
| :---: | :--- | :--- |
| **HARD LIMIT** | `lib/document/actions.ts` | The current extraction parsers (PDF.js for PDFs, Mammoth for DOCX) rely exclusively on natively encoded text bytes. |

**The Issue:** Uploading a PDF that was generated directly via a physical hardware scanner (without software-injected OCR) yields exactly `0` parseable text bytes.
**Current Behavior:** The system traps the omission, halts embedding generation to save GPU costs, and gracefully alerts the user: *"No extractable text found. Please ensure the document is not a scanned image."*
**Enterprise Workaround:** For a production rollout, a standard middleware pass utilizing `Tesseract.js` or Google Cloud Vision API should intercept empty byte-streams as a fallback extraction process prior to database insertion.

---

## 2. Gemini Rate Limits & Concurrency

| Constraint Level | Component | Description |
| :---: | :--- | :--- |
| **SOFT LIMIT** | `lib/ai/gemini.ts` | API-driven generative stream bounds. |

**The Issue:** Operating on the `gemini-flash-lite-latest` free-tier incurs strict requests-per-minute (RPM) constraints.
**Current Behavior:** The server implements an **Exponential Backoff Algorithm**. Upon receiving HTTP `429` (Rate Limited) or `503` (Resource Exhausted), the server silently halts, sleeps the thread using exponential multiples (e.g., `500ms`, `2000ms`, `4000ms`), and attempts stream reconstruction up to 3 times before finally terminating the connection to protect the UI.
**Enterprise Workaround:** Supplying a Google Studio exact-billing API key entirely erases this problem.

---

## 3. High-Velocity Scroll Micro-stutters

| Constraint Level | Component | Description |
| :---: | :--- | :--- |
| **UX LIMIT** | `DocumentViewer.tsx` | Mathematical scroll interpolation matrices. |

**The Issue:** If `Document-A` is 5 paragraphs and `Document-B` is 200 paragraphs (an extreme additive injection), mapping raw scroll offsets 1:1 visually breaks the view.
**Current Behavior:** The UI tracks `scrollTop` against normalized text-length proportion derivatives and visually searches for the closest diff-anchor array to securely pin the documents together. If a user instantly "flicks" the scroll wheel from 0 to 100%, the browser experiences a ~50ms computation block calculating the anchor map.
**Enterprise Workaround:** The **"Sync Scrolling"** UI checkbox located globally on the `ComparisonView.tsx` metrics ribbon allows users to intentionally decouple the synchronization logic if they require high-velocity isolated reading spans.

---

## 4. Multi-Page Span Fragmentation

> **Note:** The fundamental challenge of mapping raw extraction chunks to DOM coordinates involves hidden line-breaks.

**The Issue:** If an AI agent attempts to cite a quote that physically straddles `Page 3` and `Page 4` in a raw un-normalized PDF upload, strange hidden hex characters or massive whitespace blocks uniquely encode themselves mid-sentence.
**Current Behavior:** The Substring Verifier (`lib/ai/verification.ts`) natively tolerates minor whitespace and punctuation variance. However, if massive page-break artifacts shatter the Levenshtein-distance parameters, the system **aggressively favors safety over aesthetics**, intentionally flagging the citation as `verified: false`. The user sees the AI textual answer, but the UI highlight-navigation jump anchor is intentionally stripped to prevent sending the user's viewport to incorrect locations.
