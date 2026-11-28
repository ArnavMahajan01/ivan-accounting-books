// His Help choices (spec 134), loaded once and saved through the bridge after each change. They
// live on this Mac, outside the books.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { HelpPrefs } from '@shared/settings';
import { bridge } from '../bridge';

interface HelpPrefsValue {
  readonly prefs: HelpPrefs;
  readonly change: (next: (prefs: HelpPrefs) => HelpPrefs) => void;
}

const EMPTY: HelpPrefs = { starred: [], tags: [] };
const HelpPrefsContext = createContext<HelpPrefsValue>({ prefs: EMPTY, change: () => undefined });

export function HelpPrefsProvider({ children }: { readonly children: ReactNode }) {
  const [prefs, setPrefs] = useState<HelpPrefs>(EMPTY);
  const latest = useRef(prefs);
  useEffect(() => {
    const api = bridge();
    void api['help.prefs']({}).then((result) => {
      if (result.ok) {
        latest.current = result.value;
        setPrefs(result.value);
      }
    });
  }, []);
  const change = useCallback((next: (prefs: HelpPrefs) => HelpPrefs) => {
    const after = next(latest.current);
    latest.current = after;
    setPrefs(after);
    void bridge()['help.savePrefs']({
      starred: [...after.starred],
      tags: after.tags.map((t) => ({ name: t.name, guides: [...t.guides] })),
    });
  }, []);
  return (
    <HelpPrefsContext.Provider value={{ prefs, change }}>{children}</HelpPrefsContext.Provider>
  );
}

export function useHelpPrefs(): HelpPrefsValue {
  return useContext(HelpPrefsContext);
}
