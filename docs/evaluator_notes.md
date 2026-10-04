# Implementation Notes: Project Review & Limitations

## 1. How our Quote Verification works, and where it fails
Our system makes sure the AI isn't making things up by double-checking every quote.
* **How it works:**
  * When the AI answers a question, we tell it to put exact quotes inside special `<quote>` markers.
  * Our system then takes that quote and scans the real document in our database to find an exact, word-for-word match.
  * If the exact words are found, we attach a green "Verified" checkmark so you know it is highly reliable.
* **Where it fails:**
  * **Hidden Characters:** If a scanned PDF has strange invisible spaces or broken letters, our system won't recognize the match.
  * **AI Meddling:** Sometimes the AI tries to be "helpful" by fixing a typo or changing a single word inside the quote. Even if the meaning is the same, our system gets confused since it is not an exact textual match.
  * **The Result:** It flags the quote with an orange "Unverified" warning, which might make a true quote look suspicious just because of a small typo.

## 2. Handling Large Documents
Giant legal documents have too much text for the AI to read all at once without crashing. 
* **How we handle them:**
  * We process big files in the background without freezing your screen.
  * We chop the giant document into tiny pieces (about one paragraph each).
  * We store these paragraphs in a special database so the AI can pull up only the 5 or 6 paragraphs it actually needs to answer an exact question, rather than reading everything.
* **Where it fails (Size Limits):**
  * **Safe Zone:** The app handles standard documents (up to 100 to 300 pages) perfectly fine.
  * **Danger Zone:** If a document is massively huge (like 800+ or 900+ pages), the system tries to hold too much text in memory before it can chop it up. 
  * **The Result:** The server runs out of memory, times out, and the upload completely drops and fails.

## 3. Part C Option: The Redlining (Comparison) Engine
Finding exactly what changed across two versions of a contract is a huge part of legal work, so we chose to build the Redlining comparison feature.
* **How it works:**
  * The engine mathematically compares every single word in Version 1 to Version 2.
  * It detects exactly what words were added or deleted and highlights them in purple, green, or red on the screen.
* **How far we got:** 
  * We built a fully working visual layout where you can see both documents side-by-side. 
  * You can jump directly to the changes, read an AI summary of them, and click a button to download the tracked changes as a Microsoft Word (`.docx`) file.
* **The hardest part & where it fails:**
  * **The Challenge:** Finding the text differences is easy, but formatting a raw PDF back into a strict Microsoft Word layout is incredibly hard. 
  * **The Failure:** Because re-building the original design is so complex, our downloaded Word file strips away any fancy designs. 
  * **The Result:** Instead of keeping the original tables, logos, or neat margins, the download just gives you simple, plain text paragraphs with the changes marked.

## 4. What we would build next
If we had more time to work on the app, we would focus on these goals in this exact order:
* **Step 1: Make it incredibly fast and strong**
  * We would build a faster background system to process massive files.
  * Our goal is that even a 1000-page document never times out or freezes, ensuring total reliability.
* **Step 2: Guarantee strictly accurate AI answers**
  * We would teach the AI to pause and double-check itself logically before it prints a reply to the user.
  * This guarantees that complex legal advice is perfectly accurate and avoids it falling for trick questions.
* **Step 3: Make it extremely easy for everyone**
  * We would redesign the interface to be even simpler. 
  * The ultimate goal is that anyone—not just tech-savvy people or lawyers—can open the app, upload a contract, and get immediate helpful answers without needing a tutorial.
