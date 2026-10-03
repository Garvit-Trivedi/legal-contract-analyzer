import AdmZip from "adm-zip";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

export interface RedlineEdit {
  id: string;
  originalText: string;
  replacementText: string;
}

/**
 * Searches and replaces text within a docx xml using real OpenXML tracked changes.
 * 
 * Strategy:
 * 1. Extract all text from all <w:t> nodes and map their exact character offsets back to the <w:t> node.
 * 2. Find the target string in the flattened text.
 * 3. Identify all <w:t> nodes touched by this match.
 * 4. For each affected <w:t> node, split it if the match starts or ends mid-node.
 * 5. Wrap the matched <w:t> nodes in <w:del>.
 * 6. Insert <w:ins> with the replacement text.
 */
export async function applyRedlinesToDocx(buffer: Buffer, edits: RedlineEdit[]): Promise<Buffer> {
  const zip = new AdmZip(buffer);
  
  // Also we need to check if tracking changes is forced on in settings.xml. It's optional but good practice.
  let isTrackingChanged = false;
  const settingsEntry = zip.getEntry("word/settings.xml");
  if (settingsEntry) {
     const settingsXml = settingsEntry.getData().toString("utf8");
     if (!settingsXml.includes("<w:trackRevisions/>")) {
       const docSettings = new DOMParser().parseFromString(settingsXml, "text/xml");
       const settingsRoot = docSettings.documentElement;
       const tr = docSettings.createElement("w:trackRevisions");
       settingsRoot.appendChild(tr);
       zip.updateFile("word/settings.xml", Buffer.from(new XMLSerializer().serializeToString(docSettings), "utf8"));
     }
  }

  const documentEntry = zip.getEntry("word/document.xml");
  if (!documentEntry) {
    throw new Error("Invalid DOCX format: missing word/document.xml");
  }

  const xmlText = documentEntry.getData().toString("utf8");
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");

  let maxRevId = 1000;
  const timestamp = new Date().toISOString();

  // Apply edits sequentially
  for (const edit of edits) {
     if (!edit.originalText || !edit.replacementText) continue;
     
     // 1. Re-flatten text every iteration because node boundaries change.
     const textRanges = buildTextMap(doc);
     const fullText = textRanges.map(r => r.text).join("");
     
     // 2. Find original text in the flattened text
     let matchStart = fullText.indexOf(edit.originalText);
     if (matchStart === -1) {
       // Could not safely locate it exactly due to trailing spaces, etc? Try relaxing, or just skip.
       // In strict mode, we should throw. But we'll just skip and throw if no modifications were made.
       throw new Error(`Target text not found in DOCX XML: "${edit.originalText.slice(0,50)}"`);
     }
     
     const matchEnd = matchStart + edit.originalText.length;
     
     // 3. Find affected <w:t> nodes
     const affected: any[] = [];
     for (const range of textRanges) {
       const oStart = range.startOffset;
       const oEnd = range.endOffset;
       if (oEnd > matchStart && oStart < matchEnd) {
         affected.push(range);
       }
     }
     
     if (affected.length === 0) continue;
     
     maxRevId++;
     const author = "Legal Contract Analyzer";
     
     // We will collect the nodes to wrap in <w:del>
     const nodesToDel: Element[] = [];
     let nodeToInsertAfter: Element | null = null;
     
     // 4. Split boundaries
     for (let i = 0; i < affected.length; i++) {
        const range = affected[i];
        const tNode = range.node;
        const parentW_R = getParentNodeOrSelf(tNode, "w:r");
        if (!parentW_R) continue;
        
        let localStart = Math.max(0, matchStart - range.startOffset);
        let localEnd = Math.min(range.text.length, matchEnd - range.startOffset);
        
        if (localStart === 0 && localEnd === range.text.length) {
          // Whole node is deleted
          nodesToDel.push(parentW_R);
          nodeToInsertAfter = parentW_R;
        } else {
          // Split the w:r node
          const beforeText = range.text.slice(0, localStart);
          const delTxt = range.text.slice(localStart, localEnd);
          const afterText = range.text.slice(localEnd);
          
          if (beforeText.length > 0) {
             tNode.textContent = beforeText;
          } else {
             tNode.textContent = ""; 
          }
          
          const newDelRun = doc.createElement("w:r");
          // copy rPr
          const rPr = getChildNode(parentW_R, "w:rPr");
          if (rPr) newDelRun.appendChild(rPr.cloneNode(true));
          
          const newDelT = doc.createElement("w:delText");
          newDelT.setAttribute("xml:space", "preserve");
          newDelT.textContent = delTxt;
          newDelRun.appendChild(newDelT);
          
          nodesToDel.push(newDelRun);
          
          // Before placing the delRun, see if there's afterText
          if (afterText.length > 0) {
             const newAfterRun = doc.createElement("w:r");
             if (rPr) newAfterRun.appendChild(rPr.cloneNode(true));
             const newAfterT = doc.createElement("w:t");
             newAfterT.setAttribute("xml:space", "preserve");
             newAfterT.textContent = afterText;
             newAfterRun.appendChild(newAfterT);
             parentW_R.parentNode?.insertBefore(newAfterRun, parentW_R.nextSibling);
             parentW_R.parentNode?.insertBefore(newDelRun, newAfterRun);
             nodeToInsertAfter = newDelRun;
          } else {
             parentW_R.parentNode?.insertBefore(newDelRun, parentW_R.nextSibling);
             nodeToInsertAfter = newDelRun;
          }
          
          if (tNode.textContent === "") {
             parentW_R.parentNode?.removeChild(parentW_R);
          }
        }
     }
     
     // 5. Wrap deleted nodes in <w:del>
     if (nodesToDel.length > 0) {
       // Typically Word wraps multiple runs in one <w:del> if they are adjacent, but individual <w:del> per run also works fine.
       for (const n of nodesToDel) {
         if (!n.parentNode) continue; // might have been removed
         if (n.nodeName !== "w:r") {
            const delWrap = doc.createElement("w:del");
            delWrap.setAttribute("w:id", String(maxRevId));
            delWrap.setAttribute("w:author", author);
            delWrap.setAttribute("w:date", timestamp);
            
            const pNode = n.parentNode;
            pNode.insertBefore(delWrap, n);
            delWrap.appendChild(n);
         } else {
            // Already a w:r, change its w:t to w:delText if needed
            const ts = n.getElementsByTagName("w:t");
            while (ts.length > 0) {
               const tm = ts[0];
               const delT = doc.createElement("w:delText");
               delT.setAttribute("xml:space", "preserve");
               delT.textContent = tm.textContent;
               n.replaceChild(delT, tm);
            }
            
            const delWrap = doc.createElement("w:del");
            delWrap.setAttribute("w:id", String(maxRevId));
            delWrap.setAttribute("w:author", author);
            delWrap.setAttribute("w:date", timestamp);
            
            const pNode = n.parentNode;
            pNode.insertBefore(delWrap, n);
            delWrap.appendChild(n);
         }
       }
       
       // 6. Insert <w:ins> 
       if (nodeToInsertAfter && nodeToInsertAfter.parentNode) {
         let anchor: Node | null = nodeToInsertAfter;
         if (anchor.parentNode && anchor.parentNode.nodeName === "w:del") {
           anchor = anchor.parentNode;
         }
         const pn = anchor.parentNode;
         if (!pn) continue;
         const insWrap = doc.createElement("w:ins");
         insWrap.setAttribute("w:id", String(maxRevId + 1));
         insWrap.setAttribute("w:author", author);
         insWrap.setAttribute("w:date", timestamp);
         
         const newInsRun = doc.createElement("w:r");
         // Try to inherit styling from the last deleted run
         const lastDelNode = nodesToDel[nodesToDel.length - 1];
         const rPr = getChildNode(lastDelNode, "w:rPr");
         if (rPr) newInsRun.appendChild(rPr.cloneNode(true));
         
         const insT = doc.createElement("w:t");
         insT.setAttribute("xml:space", "preserve");
         insT.textContent = edit.replacementText;
         newInsRun.appendChild(insT);
         insWrap.appendChild(newInsRun);
         
         if (anchor.nextSibling) {
           pn.insertBefore(insWrap, anchor.nextSibling);
         } else {
           pn.appendChild(insWrap);
         }
       }
     }
  }

  // Repackage
  const serialized = new XMLSerializer().serializeToString(doc);
  zip.updateFile("word/document.xml", Buffer.from(serialized, "utf8"));
  
  return zip.toBuffer();
}

/** Flatten all text into ranges for mapping */
function buildTextMap(doc: Document) {
  const ts = Array.from(doc.getElementsByTagName("w:t"));
  const map = [];
  let totalOffset = 0;
  for (const t of ts) {
     if (t.parentNode && t.parentNode.nodeName === "w:del") continue; // skip already deleted stuff
     
     const txt = t.textContent || "";
     if (txt.length === 0) continue;
     
     map.push({
        node: t,
        startOffset: totalOffset,
        endOffset: totalOffset + txt.length,
        text: txt
     });
     totalOffset += txt.length;
  }
  return map;
}

function getParentNodeOrSelf(node: Node | null, name: string): Element | null {
  while (node && node.nodeType === 1) { // 1 = ELEMENT_NODE
    if (node.nodeName === name) return node as Element;
    node = node.parentNode;
  }
  return null;
}

function getChildNode(node: Element, name: string): Element | null {
  const children = Array.from(node.childNodes);
  for (const c of children) {
    if (c.nodeType === 1 && c.nodeName === name) return c as Element;
  }
  return null;
}
