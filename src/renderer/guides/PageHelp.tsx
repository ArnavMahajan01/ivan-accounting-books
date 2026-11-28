// "? Help" on each page (spec 135; W09a, Option 2): the page's guide in a panel at the side, over
// the page, without leaving it. All guides opens Help; Keep on screen turns it into the small
// panel (spec 134). Escape closes it, and focus goes back to the "? Help" button.

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Button } from '../components/Button';
import { SidePanel } from '../components/SidePanel';
import { routeHref } from '../routes';
import { GuideBody } from './GuideBody';
import { useKeepOnScreen } from './KeepOnScreen';
import { GUIDES } from './load-guides';
import './PageHelp.css';
import '../pages/HelpPage.css';

interface PageHelpValue {
  readonly open: (guideId: string) => void;
  readonly openId: string | null;
}

const PageHelpContext = createContext<PageHelpValue>({ open: () => undefined, openId: null });

export function usePageHelp(): PageHelpValue {
  return useContext(PageHelpContext);
}

export function PageHelpProvider({ children }: { readonly children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { keep } = useKeepOnScreen();
  const open = useCallback((id: string) => {
    setOpenId(id);
  }, []);
  const close = () => {
    setOpenId(null);
  };
  const guide = GUIDES.find((g) => g.id === openId);
  return (
    <PageHelpContext.Provider value={{ open, openId }}>
      {children}
      {guide !== undefined && (
        <div className="page-help">
          <SidePanel title={guide.title} onClose={close}>
            <div className="page-help__actions">
              <Button
                size="small"
                onClick={() => {
                  close();
                  window.location.hash = routeHref('help');
                }}
              >
                All guides
              </Button>
              <Button
                size="small"
                onClick={() => {
                  keep(guide.id);
                  close();
                }}
              >
                Keep on screen
              </Button>
            </div>
            <div className="help-reader page-help__reader">
              <p className="help-reader__summary">{guide.summary}</p>
              <GuideBody guide={guide} />
            </div>
          </SidePanel>
        </div>
      )}
    </PageHelpContext.Provider>
  );
}
