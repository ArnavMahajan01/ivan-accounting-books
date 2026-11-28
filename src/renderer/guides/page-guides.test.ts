import { describe, expect, it } from 'vitest';
import { PAGES } from '@shared/pages';
import { GUIDES } from './load-guides';
import { guideForPage, PAGE_GUIDES } from './page-guides';

describe("each page's guide (spec 135)", () => {
  it('exists for every page but Help', () => {
    const ids = new Set(GUIDES.map((g) => g.id));
    for (const page of PAGES) {
      const guide = guideForPage(page.id, `#/${page.id}`);
      if (page.id === 'help') expect(guide).toBeNull();
      else expect(ids.has(guide ?? '')).toBe(true);
    }
    expect(Object.values(PAGE_GUIDES).every((id) => ids.has(id))).toBe(true);
  });

  it('is the report’s own guide on the BAS and closing pages', () => {
    expect(guideForPage('reports', '#/reports/bas')).toBe('check-the-bas-worksheet');
    expect(guideForPage('reports', '#/reports/close')).toBe('close-and-lock-a-quarter');
    expect(guideForPage('reports', '#/reports/profit-and-loss')).toBe('read-your-profit-and-loss');
  });
});
