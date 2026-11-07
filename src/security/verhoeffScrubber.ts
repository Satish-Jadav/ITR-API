// Verhoeff Algorithm Tables
const d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function validateVerhoeff(numStr: string): boolean {
  let c = 0;
  const digits = numStr.split('').reverse().map(Number);
  for (let i = 0; i < digits.length; i++) {
    c = d[c][p[i % 8][digits[i]]];
  }
  return c === 0;
}

export function scrubVerhoeffAndPan(text: string): { scrubbedText: string; redactedCount: number } {
  let count = 0;

  // 1. Scrub PAN: 5 letters, 4 digits, 1 letter (case-insensitive + boundary safe e.g. ABCDE1234F / abcde1234f)
  let scrubbed = text.replace(/(^|[^A-Za-z0-9])([A-Za-z]{5}[0-9]{4}[A-Za-z])(?=[^A-Za-z0-9]|$)/g, (_match, prefix) => {
    count++;
    return prefix + '[PAN_REDACTED]';
  });

  // 2. Scrub 12-digit Aadhaar & 16-digit VID (fail-safe for financial transcripts even if OCR checksum has single digit typo)
  scrubbed = scrubbed.replace(/(^|[^0-9])(\d{4}[\s-]?\d{4}[\s-]?\d{4}|\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})(?=[^0-9]|$)/g, (_match, prefix, digitsGroup) => {
    const raw = digitsGroup.replace(/[\s-]/g, '');
    if (raw.length === 12 || raw.length === 16) {
      count++;
      return prefix + (raw.length === 12 ? '[AADHAAR_REDACTED]' : '[VID_REDACTED]');
    }
    return prefix + digitsGroup;
  });

  return { scrubbedText: scrubbed, redactedCount: count };
}
