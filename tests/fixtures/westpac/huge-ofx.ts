// Writes a long statement for tests that need one, so the repository does not carry a file of over
// a megabyte. The lines are invented and repeat a few descriptions. Every amount is a whole number
// of cents, and every line has its own FITID.

export function hugeOfx(lineCount: number): string {
  const names = ['BUNNINGS 4532', 'AMPOL ALEXANDRIA', 'CORNER HARDWARE SUPPLIES', 'SKYLINK MOBILE'];
  let balance = 1_000_000;
  let body = '';
  for (let i = 0; i < lineCount; i += 1) {
    const cents = 100 + ((i * 7919) % 90_000);
    balance -= cents;
    const day = 1 + (i % 28);
    const date = `2026-01-${String(day).padStart(2, '0')}`.replaceAll('-', '');
    const dollars = `${String(Math.floor(cents / 100))}.${String(cents % 100).padStart(2, '0')}`;
    body += `<STMTTRN>\n<TRNTYPE>DEBIT\n<DTPOSTED>${date}\n<TRNAMT>-${dollars}\n<FITID>H${String(i).padStart(7, '0')}\n<NAME>${names[i % names.length] ?? 'BUNNINGS 4532'}\n</STMTTRN>\n`;
  }
  const closing = `${balance < 0 ? '-' : ''}${String(Math.floor(Math.abs(balance) / 100))}.${String(Math.abs(balance) % 100).padStart(2, '0')}`;
  return `OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\nSECURITY:NONE\nENCODING:USASCII\nCHARSET:1252\nCOMPRESSION:NONE\nOLDFILEUID:NONE\nNEWFILEUID:NONE\n\n<OFX>\n<BANKMSGSRSV1>\n<STMTTRNRS>\n<STMTRS>\n<CURDEF>AUD\n<BANKACCTFROM>\n<BANKID>032000\n<ACCTID>100004821\n<ACCTTYPE>CHECKING\n</BANKACCTFROM>\n<BANKTRANLIST>\n<DTSTART>20260101\n<DTEND>20260128\n${body}</BANKTRANLIST>\n<LEDGERBAL>\n<BALAMT>${closing}\n<DTASOF>20260128\n</LEDGERBAL>\n</STMTRS>\n</STMTTRNRS>\n</BANKMSGSRSV1>\n</OFX>\n`;
}
