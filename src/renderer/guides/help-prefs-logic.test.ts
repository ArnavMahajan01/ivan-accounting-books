import { describe, expect, it } from 'vitest';
import { deleteTag, setGuideTags, tagName, tagsOf, toggleStar } from './help-prefs-logic';

const none = { starred: [], tags: [] };

describe('stars and tags (spec 134)', () => {
  it('writes a tag the same way however it is typed', () => {
    expect(tagName(' #Quarter End ')).toBe('quarter-end');
    expect(tagName('Accountant!')).toBe('accountant');
    expect(tagName('###')).toBeNull();
  });

  it('stars and unstars a guide', () => {
    const starred = toggleStar(none, 'getting-started');
    expect(starred.starred).toEqual(['getting-started']);
    expect(toggleStar(starred, 'getting-started').starred).toEqual([]);
  });

  it('puts a guide under its tags, and drops a tag nothing is under', () => {
    let prefs = setGuideTags(none, 'close-and-lock-a-quarter', ['Quarter end', 'accountant']);
    prefs = setGuideTags(prefs, 'publish-a-report', ['accountant']);
    expect(tagsOf(prefs, 'close-and-lock-a-quarter')).toEqual(['quarter-end', 'accountant']);
    prefs = setGuideTags(prefs, 'close-and-lock-a-quarter', ['accountant']);
    expect(prefs.tags.map((t) => t.name)).toEqual(['accountant']);
    expect(deleteTag(prefs, 'accountant').tags).toEqual([]);
  });
});
