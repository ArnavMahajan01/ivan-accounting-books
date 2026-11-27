// Ready formulas in the app (spec 113; W07a, Option 4): plain names, what each does, the formula,
// and Copy, which puts it on the Mac's clipboard ready to paste into a cell. The same list is the
// "Ready formulas" tab of every published workbook, with a working example of each.

import { Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReadyFormulaView } from '@shared/sheets';
import { bridge } from '../bridge';
import { Button } from '../components/Button';
import { Sheet } from '../components/Sheet';

export function ReadyFormulasSheet({ onClose }: { readonly onClose: () => void }) {
  const [formulas, setFormulas] = useState<readonly ReadyFormulaView[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const api = bridge();
    void api['sheets.readyFormulas']({}).then((result) => {
      if (result.ok) setFormulas(result.value);
    });
  }, []);

  const copy = async (formula: ReadyFormulaView) => {
    const result = await bridge()['app.copyText']({ text: formula.formula });
    setCopied(result.ok ? `Copied "${formula.name}". Paste it into a cell in your sheet.` : null);
  };

  return (
    <Sheet
      title="Ready formulas"
      description="Copy one, then paste it into a cell in your Google Sheet. Each is also on the Ready formulas tab of every published workbook, with an example."
      size="wide"
      onClose={onClose}
      actions={
        <Button variant="main" onClick={onClose}>
          Done
        </Button>
      }
    >
      {formulas === null && <p aria-busy="true">Reading the list…</p>}
      {formulas !== null && (
        <table className="ready">
          <thead>
            <tr>
              <th scope="col">Ready formula</th>
              <th scope="col">What it does</th>
              <th scope="col">Formula</th>
              <th scope="col">
                <span className="visually-hidden">Copy</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {formulas.map((f) => (
              <tr key={f.name}>
                <th scope="row" className="ready__name">
                  {f.name}
                </th>
                <td className="ready__what">{f.what}</td>
                <td>
                  <code className="ready__formula">{f.formula}</code>
                </td>
                <td>
                  <Button
                    size="small"
                    icon={Copy}
                    aria-label={`Copy ${f.name}`}
                    onClick={() => void copy(f)}
                  >
                    Copy
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="publish__line publish__line--note" role="status">
        {copied}
      </p>
    </Sheet>
  );
}
