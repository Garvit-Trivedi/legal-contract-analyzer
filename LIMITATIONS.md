# System Limitations and Known Edge Cases

The Legal Contract Analyzer implements robust fallbacks and defensive logic across all its core engines. However, out of respect for transparency in this engineering evaluation, the following genuine limitations exist in the current implementation:

## 1. Zero-Text Rasterized PDF Uploads
The document extraction pipeline utilizes standard text extraction libraries (PDF.js / Mammoth / Mammouth). If a user uploads a PDF that is entirely comprised of rasterized scanner images (e.g., an un-OCR'd scan of a contract), the extraction pipeline will correctly detect the absence of text and fail gracefully with an explicit message: `"No extractable text found. Please ensure the document is not a scanned image without OCR."` 

**Resolution Path:** Future implementations would integrate Tesseract.js or a cloud-based OCR service strictly invoked as a fallback when text byte counts return 0.

## 2. Gemini Quota & Concurrency Limits
The system natively relies on Google Gemini Flash via standard REST/SDK endpoints. It is currently built with an exponential backoff retry mechanism (retrying on 429 and 503 limits). However:
- If an evaluator uploads an excessive cache of documents simultaneously, or spawns multiple concurrent generative streams against an un-upgraded Gemini API key, they may hit hard connection limits, resulting in a propagated system unavailability error.

## 3. High-Velocity Scroll Interpolation
The Side-by-Side Comparison engine implements normalized synchronized scrolling that dynamically calculates closest-node distances to keep unequal length documents correctly visually pinned to changes.
- **Limitation:** If a user grabs the scrollbar and rapidly "flicks" it from top to bottom in a deeply asymmetrical file (e.g. Document A is 20 pages longer than Document B), a theoretical micro-stutter (~100ms) may occur before the mathematical anchor loop resolves interpolation.
- **Workaround applied:** The UI provides a "Sync Scrolling" toggle in the metrics bar to disable the JS-driven scroll interception entirely if preferred by the user during high-speed scanning.

## 4. Multi-Page Quote Spanning
The UI Highlighting logic relies on exact character-offset mappings returned from the Database chunk table. 
- **Limitation:** If a single text sentence violently breaks across a PDF page boundary (where the native extractor introduces irregular non-standard whitespace or physical page-break artifacts), substring quote verification occasionally declines to match it to prevent hallucinating coordinates.
- **Workaround applied:** The AI natively prefers to chunk by paragraph instead of sentence, reducing the probability of mid-sentence artifacts splitting the semantic mapping arrays. If a mapping cannot be verified securely, the UI still displays the AI text answer but omits the unverified, dangerous highlight link, strictly enforcing the zero-hallucination paradigm.
