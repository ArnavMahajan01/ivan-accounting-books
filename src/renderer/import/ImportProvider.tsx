// The import flow for the whole window: choosing a file or dropping one anywhere, the preview
// sheet, confirming, and the result. It sits above the pages so a file dropped on any page opens
// the same sheet (spec 064). The renderer never reads the file: it passes a path, and the main
// process reads and checks it.

import { Upload } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { CommitOutcome, ImportPreview, ImportRefusal } from '@shared/views';
import { bridge } from '../bridge';
import { useBooksState } from '../books-state';
import { ImportSheet, type ImportStep } from './ImportSheet';
import './ImportProvider.css';

type Source = { readonly kind: 'choose' } | { readonly kind: 'path'; readonly path: string };

export interface ImportFlow {
  /** Opens the Mac's file chooser, or previews a path already known. */
  readonly start: (source: Source) => void;
  /** Changes each time an import is saved, so a page can show the new figures. */
  readonly importedCount: number;
}

const NOT_AVAILABLE: ImportFlow = { start: () => undefined, importedCount: 0 };
const ImportContext = createContext<ImportFlow>(NOT_AVAILABLE);

export function useImport(): ImportFlow {
  return useContext(ImportContext);
}

function hasFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') ?? false;
}

export function ImportProvider({ children }: { readonly children: ReactNode }) {
  const { refreshReviewCount, version } = useBooksState();
  const [step, setStep] = useState<ImportStep>({ kind: 'closed' });
  // A second click while a file is being chosen or read does nothing. The button is not disabled
  // for it, because a disabled button loses keyboard focus, and the sheet could not give it back.
  const busy = useRef(false);
  const [importedCount, setImportedCount] = useState(0);
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  // Loading or clearing sample data replaces the books, so anything open is closed.
  useEffect(() => {
    setStep({ kind: 'closed' });
  }, [version]);

  const showOutcome = useCallback(
    (result: Awaited<ReturnType<ReturnType<typeof bridge>['bank.previewFile']>>) => {
      if (!result.ok) {
        setStep({ kind: 'failed' });
      } else if (result.value.kind === 'cancelled') {
        setStep({ kind: 'closed' });
      } else if (result.value.kind === 'refused') {
        setStep({ kind: 'refused', reason: result.value.reason, lastFour: result.value.lastFour });
      } else {
        setStep({ kind: 'preview', preview: result.value.preview });
      }
    },
    [],
  );

  const start = useCallback(
    (source: Source) => {
      if (busy.current) return;
      busy.current = true;
      const api = bridge();
      const answer =
        source.kind === 'choose'
          ? api['bank.chooseAndPreview']({})
          : api['bank.previewFile']({ path: source.path });
      void answer
        .then(showOutcome)
        .catch(() => {
          setStep({ kind: 'failed' });
        })
        .finally(() => {
          busy.current = false;
        });
    },
    [showOutcome],
  );

  const confirm = useCallback(
    (preview: ImportPreview) => {
      setStep({ kind: 'saving', preview });
      const api = bridge();
      void api['bank.commitImport']({ previewId: preview.previewId })
        .then((result) => {
          if (!result.ok) {
            setStep({ kind: 'failed' });
            return;
          }
          const outcome: CommitOutcome = result.value;
          if (outcome.kind === 'imported') {
            refreshReviewCount();
            setImportedCount((n) => n + 1);
            setStep({ kind: 'done', outcome });
          } else {
            setStep({ kind: 'not-saved', reason: outcome.reason });
          }
        })
        .catch(() => {
          setStep({ kind: 'failed' });
        });
    },
    [refreshReviewCount],
  );

  // Any file dropped anywhere on the window opens the preview, on the Bank page.
  useEffect(() => {
    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth.current += 1;
      setDragging(true);
    };
    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    };
    const onOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      // Without this the window would try to open the file as a page.
      event.preventDefault();
      depth.current = 0;
      setDragging(false);
      const files = [...(event.dataTransfer?.files ?? [])];
      if (files.length !== 1) {
        setStep({ kind: 'notice', message: 'Drop one statement file at a time.' });
        return;
      }
      const [file] = files;
      const path = file === undefined ? '' : bridge().pathForFile(file);
      window.location.hash = '#/bank';
      if (path === '') {
        setStep({
          kind: 'refused',
          reason: 'unreadable-file' satisfies ImportRefusal,
          lastFour: null,
        });
        return;
      }
      start({ kind: 'path', path });
    };
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('dragover', onOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [start]);

  const value = useMemo(() => ({ start, importedCount }), [start, importedCount]);
  return (
    <ImportContext.Provider value={value}>
      {children}
      {dragging && (
        <div className="drop-overlay" aria-hidden="true">
          <Upload className="drop-overlay__icon" />
          <p>Drop a statement file here to import it</p>
        </div>
      )}
      <ImportSheet
        step={step}
        onClose={() => {
          setStep({ kind: 'closed' });
        }}
        onConfirm={confirm}
        onChooseAnother={() => {
          setStep({ kind: 'closed' });
          start({ kind: 'choose' });
        }}
      />
    </ImportContext.Provider>
  );
}
