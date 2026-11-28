// Keep on screen (spec 134; W09a, Option 3): a guide as a small panel over every page, so he can
// follow it while he works. Drag its title bar, or focus the title bar and use the arrow keys
// (Shift moves further), make it smaller, or close it. He can tick each step; the ticks are only
// for this time.

import { ChevronDown, ChevronUp, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import type { Guide } from '@shared/guide';
import { GUIDES } from './load-guides';
import './KeepOnScreen.css';

interface KeepValue {
  readonly guideId: string | null;
  readonly keep: (guideId: string) => void;
  readonly close: () => void;
}

const KeepContext = createContext<KeepValue>({
  guideId: null,
  keep: () => undefined,
  close: () => undefined,
});

export function useKeepOnScreen(): KeepValue {
  return useContext(KeepContext);
}

const STEP = 16;
const BIG_STEP = 64;

function Panel({ guide, onClose }: { readonly guide: Guide; readonly onClose: () => void }) {
  const steps = guide.sections.flatMap((s) => s.steps.map((step) => step.text));
  const [ticked, setTicked] = useState<ReadonlySet<number>>(new Set());
  const [small, setSmall] = useState(false);
  const [at, setAt] = useState({ right: 24, bottom: 24 });
  const [drag, setDrag] = useState<{ x: number; y: number; right: number; bottom: number } | null>(
    null,
  );

  const moveBy = (dx: number, dy: number) => {
    setAt((p) => ({ right: Math.max(0, p.right - dx), bottom: Math.max(0, p.bottom - dy) }));
  };
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? BIG_STEP : STEP;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (move !== undefined) {
      event.preventDefault();
      moveBy(move[0], move[1]);
    }
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button') !== null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ x: event.clientX, y: event.clientY, ...at });
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (drag === null) return;
    setAt({
      right: Math.max(0, drag.right - (event.clientX - drag.x)),
      bottom: Math.max(0, drag.bottom - (event.clientY - drag.y)),
    });
  };

  return (
    <aside
      className="keep-panel"
      aria-label={`Guide on screen: ${guide.title}`}
      style={{ right: at.right, bottom: at.bottom }}
    >
      <div
        className="keep-panel__bar"
        tabIndex={0}
        role="group"
        aria-label="Move the guide with the arrow keys"
        onKeyDown={onKey}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          setDrag(null);
        }}
      >
        <span className="keep-panel__title">{guide.title}</span>
        <button
          type="button"
          className="keep-panel__button"
          aria-label={small ? 'Show the steps' : 'Make smaller'}
          aria-expanded={!small}
          onClick={() => {
            setSmall((v) => !v);
          }}
        >
          {small ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="keep-panel__button"
          aria-label="Close the guide"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </div>
      {!small && (
        <>
          <ol className="keep-panel__steps">
            {steps.map((text, i) => (
              <li key={i}>
                <label
                  className={
                    ticked.has(i) ? 'keep-panel__step keep-panel__step--done' : 'keep-panel__step'
                  }
                >
                  <input
                    type="checkbox"
                    checked={ticked.has(i)}
                    onChange={() => {
                      setTicked((before) => {
                        const next = new Set(before);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      });
                    }}
                  />
                  <span>{text}</span>
                </label>
              </li>
            ))}
          </ol>
          <p className="keep-panel__foot">
            Drag to move · {ticked.size} of {steps.length} steps done
          </p>
        </>
      )}
    </aside>
  );
}

export function KeepOnScreenProvider({
  children,
  guides = GUIDES,
}: {
  readonly children: ReactNode;
  readonly guides?: readonly Guide[];
}) {
  const [guideId, setGuideId] = useState<string | null>(null);
  const keep = useCallback((id: string) => {
    setGuideId(id);
  }, []);
  const close = useCallback(() => {
    setGuideId(null);
  }, []);
  const guide = guides.find((g) => g.id === guideId);
  return (
    <KeepContext.Provider value={{ guideId, keep, close }}>
      {children}
      {guide !== undefined && <Panel key={guide.id} guide={guide} onClose={close} />}
    </KeepContext.Provider>
  );
}
