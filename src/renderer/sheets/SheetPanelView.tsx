// The real Google Sheet inside the app (spec 118; W07a, Option 2): a bar with the sheet's name and
// Open in Chrome, always one click away, and below it the area the main process puts Google's page
// in. If Google refuses or the page does not load, a plain fallback says so and offers Chrome.

import { ChevronLeft, ExternalLink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { bridge } from '../bridge';
import { Button } from '../components/Button';
import { SIDE_BY_SIDE_HOW, SideBySide } from './SideBySide';
import './sheets.css';

/** The area's place in the window, in whole points. */
function boundsOf(element: HTMLElement) {
  const r = element.getBoundingClientRect();
  return {
    x: Math.max(0, Math.round(r.left)),
    y: Math.max(0, Math.round(r.top)),
    width: Math.max(1, Math.round(r.width)),
    height: Math.max(1, Math.round(r.height)),
  };
}

export function SheetPanelView({
  linkId,
  title,
  onBack,
}: {
  readonly linkId: string;
  readonly title: string;
  readonly onBack: () => void;
}) {
  const area = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'opened' | 'failed'>('loading');
  const [told, setTold] = useState(false);

  useEffect(() => {
    const element = area.current;
    if (element === null) return;
    const api = bridge();
    let current = true;
    void api['sheetPanel.open']({ linkId, bounds: boundsOf(element) }).then((result) => {
      if (!current) return;
      setState(result.ok && result.value.result === 'opened' ? 'opened' : 'failed');
    });
    const move = () => {
      void api['sheetPanel.move']({ bounds: boundsOf(element) });
    };
    const observer = new ResizeObserver(move);
    observer.observe(element);
    window.addEventListener('resize', move);
    return () => {
      current = false;
      observer.disconnect();
      window.removeEventListener('resize', move);
      void api['sheetPanel.close']({});
    };
  }, [linkId]);

  const openInBrowser = () => {
    void bridge()['sheets.open']({ linkId });
  };

  return (
    <div className="sheet-panel">
      <div className="sheet-panel__bar">
        <Button size="small" icon={ChevronLeft} onClick={onBack}>
          Shared sheets
        </Button>
        <h1 className="sheet-panel__title">{title}</h1>
        <SideBySide
          linkId={linkId}
          onOpen={() => {
            setTold(true);
          }}
        />
        <Button size="small" icon={ExternalLink} onClick={openInBrowser}>
          Open in Chrome
        </Button>
      </div>
      {told && <p className="publish__line publish__line--note">{SIDE_BY_SIDE_HOW}</p>}
      <div ref={area} className="sheet-panel__area" aria-busy={state === 'loading'}>
        {state === 'loading' && <p className="sheet-panel__note">Opening the sheet…</p>}
        {state === 'failed' && (
          <div className="sheet-panel__fallback" role="status">
            <p className="sheet-panel__fallback-title">The sheet could not open inside the app</p>
            <p>It is safe in your Google Drive. Open it in Chrome instead.</p>
            <Button variant="main" icon={ExternalLink} onClick={openInBrowser}>
              Open in Chrome
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
