import { describe, expect, it } from 'vitest';
import { guideSchema } from '@shared/guide';
import { groupGuides } from './group-guides';

const guide = (id: string) =>
  guideSchema.parse({
    id,
    title: id,
    group: 'Getting started',
    summary: 's',
    sections: [{ heading: 'h', paragraphs: ['p'] }],
  });

describe('groupGuides', () => {
  it('puts guides under their group, keeping their order', () => {
    expect(
      groupGuides([guide('a'), guide('b')]).map((g) => [g.group, g.guides.map((x) => x.id)]),
    ).toEqual([['Getting started', ['a', 'b']]]);
  });

  it('leaves out a group with no guides', () => {
    expect(groupGuides([])).toEqual([]);
  });
});
