export function verifyQuote(sourceText: string, candidateQuote: string, chunkCharStart: number = 0) {
  // Normalize candidate quote
  const normCandidate = candidateQuote.replace(/[\s\u200B-\u200D\uFEFF]+/g, ' ').trim();
  
  if (!normCandidate) return { verified: false };

  // Normalize sourceText and build mapping
  let normSource = '';
  const mapping: number[] = [];
  
  let inWhitespace = false;
  for (let i = 0; i < sourceText.length; i++) {
    const char = sourceText[i];
    const isWS = /[\s\u200B-\u200D\uFEFF]/.test(char);
    
    if (isWS) {
      if (!inWhitespace && normSource.length > 0) {
        mapping.push(i);
        normSource += ' ';
        inWhitespace = true;
      }
    } else {
      mapping.push(i);
      normSource += char;
      inWhitespace = false;
    }
  }
  
  if (normSource.endsWith(' ') && mapping.length === normSource.length) {
     normSource = normSource.slice(0, -1);
     mapping.pop();
  }
  
  let index = normSource.indexOf(normCandidate);
  
  // Case-insensitive fallback if exact casing wasn't matched
  if (index === -1) {
    index = normSource.toLowerCase().indexOf(normCandidate.toLowerCase());
  }

  if (index === -1) {
    return { verified: false };
  }
  
  const exactStart = mapping[index];
  const exactEnd = mapping[index + normCandidate.length - 1] + 1;
  
  return {
    verified: true,
    exactQuote: sourceText.substring(exactStart, exactEnd),
    characterStart: chunkCharStart + exactStart,
    characterEnd: chunkCharStart + exactEnd,
  };
}
