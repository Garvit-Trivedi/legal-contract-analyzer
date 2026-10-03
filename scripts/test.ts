import { verifyQuote } from "./src/lib/ai/verification";
function runTest(name: string, source: string, candidate: string, expected: boolean) {
  const res = verifyQuote(source, candidate, 0);
  if (res.verified === expected) {
    console.log("PASS: " + name);
  } else {
    console.log("FAIL: " + name + " (Expected " + expected + ", got " + res.verified + ")");
  }
}
runTest("TEST A - EXACT QUOTE", "The tenant shall provide thirty days written notice.", "The tenant shall provide thirty days written notice.", true);
runTest("TEST B - WHITESPACE DIFFERENCE", "The tenant shall provide\nthirty days written notice.", "The tenant shall provide thirty days written notice.", true);
runTest("TEST C - FALSE QUOTE", "The tenant shall provide thirty days written notice.", "The tenant shall provide ninety days written notice.", false);
runTest("TEST D - ALTERED LEGAL LANGUAGE", "The receiving party may terminate this agreement.", "The receiving party shall terminate this agreement.", false);
