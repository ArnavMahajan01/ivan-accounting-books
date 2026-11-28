// Settings, Appearance (spec 133): the same as the Mac, light or dark. The main process tells the
// window, so the screens follow at once through the colour scheme; nothing else changes.

import { SunMoon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { APPEARANCES, type Appearance } from '@shared/settings';
import { bridge } from '../bridge';
import '../pages/SettingsPage.css';

/**
 * Puts the choice on the page: `data-theme` on <html>, which the tokens follow (tokens.css), and
 * none for the same as the Mac. The window is told too, by the main process.
 */
export function applyAppearance(value: Appearance): void {
  if (value === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = value;
}

const WORDS: Record<Appearance, string> = {
  system: 'Same as Mac',
  light: 'Light',
  dark: 'Dark',
};

export function AppearanceCard() {
  const [choice, setChoice] = useState<Appearance | null>(null);
  useEffect(() => {
    const api = bridge();
    void api['appearance.get']({}).then((result) => {
      if (result.ok) {
        setChoice(result.value.appearance);
        applyAppearance(result.value.appearance);
      }
    });
  }, []);

  const choose = async (value: Appearance) => {
    const before = choice;
    setChoice(value);
    applyAppearance(value);
    const result = await bridge()['appearance.set']({ appearance: value });
    if (!result.ok) {
      setChoice(before);
      if (before !== null) applyAppearance(before);
    }
  };

  return (
    <section className="page-surface settings-card" aria-labelledby="settings-appearance">
      <h2 id="settings-appearance" className="settings-card__title">
        <SunMoon aria-hidden="true" className="settings-card__icon" />
        Appearance
      </h2>
      <fieldset className="review__show settings-appearance">
        <legend className="visually-hidden">Appearance</legend>
        {APPEARANCES.map((a) => (
          <label key={a} className="review__show-option">
            <input
              type="radio"
              name="appearance"
              value={a}
              checked={choice === a}
              disabled={choice === null}
              onChange={() => void choose(a)}
            />
            <span>{WORDS[a]}</span>
          </label>
        ))}
      </fieldset>
    </section>
  );
}
