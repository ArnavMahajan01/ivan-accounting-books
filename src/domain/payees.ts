// How a bank description points to a contact (spec 071). A description's "words" are its letter
// words in capitals, one space apart: `EFTPOS BUNNINGS 4532 SYDNEY` gives `EFTPOS BUNNINGS SYDNEY`.
// Numbers are dropped, because a store number or a reference changes from line to line while the
// name does not. A saved match applies to every line whose words start with it, whole words only,
// and the longest saved match wins.

/** The letter words of a description, in capitals. Empty when it has none. */
export function descriptionWords(description: string): string {
  return description
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter((word) => word.length >= 2)
    .join(' ');
}

export interface ContactMatch {
  readonly words: string;
  readonly contactId: string;
}

/** Whether a line's words start with the saved words, as whole words. */
export function wordsStartWith(lineWords: string, saved: string): boolean {
  if (saved === '') return false;
  return lineWords === saved || lineWords.startsWith(`${saved} `);
}

/** The contact whose saved words fit the line best (the longest that fits), or null. */
export function contactForWords(
  lineWords: string,
  matches: readonly ContactMatch[],
): ContactMatch | null {
  let best: ContactMatch | null = null;
  for (const match of matches) {
    if (!wordsStartWith(lineWords, match.words)) continue;
    if (best === null || match.words.length > best.words.length) best = match;
  }
  return best;
}
