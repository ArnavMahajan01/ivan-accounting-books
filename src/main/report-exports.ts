// Saving a report as CSV or PDF (specs 098, 099). The main process asks where to save with the
// Mac's own save sheet, and writes the file; the screens never touch files. A PDF is printed by a
// hidden window that is sandboxed, runs no script, may load nothing but the page itself, and is
// destroyed afterwards.

import { BrowserWindow, dialog, session } from 'electron';
import { writeFile } from 'node:fs/promises';

export type ExportResult = 'saved' | 'cancelled' | 'failed';

export interface ReportExports {
  /** Asks where to save, then writes the text (CSV) or prints the page (PDF) there. */
  save(kind: 'csv' | 'pdf', suggestedName: string, content: string): Promise<ExportResult>;
}

const PDF_PARTITION = 'report-pdf';

async function printPdf(html: string): Promise<Buffer> {
  const pdfSession = session.fromPartition(PDF_PARTITION);
  // Nothing but the page itself may load: no network, no file, ever.
  pdfSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !details.url.startsWith('data:') });
  });
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      javascript: false,
      contextIsolation: true,
      nodeIntegration: false,
      partition: PDF_PARTITION,
    },
  });
  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    return await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: false,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate:
        '<div style="width:100%;font-size:8pt;text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    });
  } finally {
    win.destroy();
  }
}

export function createReportExports(parent: () => BrowserWindow | null): ReportExports {
  return {
    async save(kind, suggestedName, content) {
      const options = {
        title: kind === 'csv' ? 'Export to CSV' : 'Export to PDF',
        defaultPath: suggestedName,
        filters:
          kind === 'csv'
            ? [{ name: 'CSV file', extensions: ['csv'] }]
            : [{ name: 'PDF document', extensions: ['pdf'] }],
      };
      const window = parent();
      const chosen =
        window === null
          ? await dialog.showSaveDialog(options)
          : await dialog.showSaveDialog(window, options);
      if (chosen.canceled || chosen.filePath === '') return 'cancelled';
      try {
        if (kind === 'csv') await writeFile(chosen.filePath, content, 'utf8');
        else await writeFile(chosen.filePath, await printPdf(content));
        return 'saved';
      } catch {
        return 'failed';
      }
    },
  };
}
