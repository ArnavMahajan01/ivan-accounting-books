import { GUIDE_GROUPS, type Guide, type GuideGroup } from '@shared/guide';

export interface GuideGroupList {
  readonly group: GuideGroup;
  readonly guides: readonly Guide[];
}

/** The guides under their feature group, in Help's order. A group with no guides is left out. */
export function groupGuides(guides: readonly Guide[]): GuideGroupList[] {
  const byGroup = new Map<GuideGroup, Guide[]>();
  for (const guide of guides)
    byGroup.set(guide.group, [...(byGroup.get(guide.group) ?? []), guide]);
  return GUIDE_GROUPS.flatMap((group) => {
    const inGroup = byGroup.get(group);
    return inGroup === undefined ? [] : [{ group, guides: inGroup }];
  });
}
