// Stars and tags (spec 134), as pure changes to his Help choices. The screens call these, then
// save the result through the bridge.

import { MAX_TAG_LENGTH, MAX_TAGS, type HelpPrefs } from '@shared/settings';

/** "Quarter end" or "#quarter-end" becomes quarter-end. Null when nothing usable is left. */
export function tagName(typed: string): string | null {
  const name = typed
    .trim()
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_TAG_LENGTH);
  return name === '' ? null : name;
}

export function toggleStar(prefs: HelpPrefs, guideId: string): HelpPrefs {
  return prefs.starred.includes(guideId)
    ? { ...prefs, starred: prefs.starred.filter((id) => id !== guideId) }
    : { ...prefs, starred: [...prefs.starred, guideId] };
}

export function tagsOf(prefs: HelpPrefs, guideId: string): string[] {
  return prefs.tags.filter((t) => t.guides.includes(guideId)).map((t) => t.name);
}

/** Puts the guide under exactly these tags, making new ones as needed. Empty tags are dropped. */
export function setGuideTags(
  prefs: HelpPrefs,
  guideId: string,
  names: readonly string[],
): HelpPrefs {
  const wanted = new Set(names.flatMap((n) => tagName(n) ?? []));
  const tags = prefs.tags.map((t) => ({
    name: t.name,
    guides: wanted.has(t.name)
      ? [...new Set([...t.guides, guideId])]
      : t.guides.filter((g) => g !== guideId),
  }));
  for (const name of wanted) {
    if (!tags.some((t) => t.name === name) && tags.length < MAX_TAGS) {
      tags.push({ name, guides: [guideId] });
    }
  }
  return { ...prefs, tags: tags.filter((t) => t.guides.length > 0) };
}

export function deleteTag(prefs: HelpPrefs, name: string): HelpPrefs {
  return { ...prefs, tags: prefs.tags.filter((t) => t.name !== name) };
}
