import { describe, expect, it } from 'vitest';
import { guideSchema, type Guide } from '@shared/guide';
import { searchGuides } from './search';

function guide(id: string, over: Record<string, unknown> = {}): Guide {
  return guideSchema.parse({
    id,
    title: `Guide ${id}`,
    group: 'Getting started',
    summary: 'A short summary.',
    sections: [{ heading: 'Heading', paragraphs: ['A paragraph.'], steps: [{ text: 'A step.' }] }],
    ...over,
  });
}

describe('searchGuides', () => {
  const bank = guide('bank', {
    title: 'Bring in a statement',
    sections: [
      {
        heading: 'Steps',
        steps: [
          {
            text: 'Click Import file.',
            image: { file: 'x.png', description: 'The Import dialog' },
          },
        ],
      },
    ],
  });
  const other = guide('other');

  it('finds every guide when the search is empty or only spaces', () => {
    expect(searchGuides([bank, other], '')).toEqual([bank, other]);
    expect(searchGuides([bank, other], '   ')).toEqual([bank, other]);
  });

  it('finds a guide by a word in a step, in any case', () => {
    expect(searchGuides([bank, other], 'IMPORT')).toEqual([bank]);
  });

  it('finds by title, summary, heading, paragraph and image description', () => {
    expect(searchGuides([bank, other], 'statement')).toEqual([bank]);
    expect(searchGuides([bank, other], 'short summary')).toEqual([bank, other]);
    expect(searchGuides([bank, other], 'heading')).toEqual([other]);
    expect(searchGuides([bank, other], 'paragraph')).toEqual([other]);
    expect(searchGuides([bank, other], 'dialog')).toEqual([bank]);
  });

  it('needs every word, in any order, and part of a word is enough', () => {
    expect(searchGuides([bank, other], 'file click')).toEqual([bank]);
    expect(searchGuides([bank, other], 'click paragraph')).toEqual([]);
    expect(searchGuides([bank, other], 'imp')).toEqual([bank]);
  });

  it('finds nothing for a word no guide has', () => {
    expect(searchGuides([bank, other], 'zebra')).toEqual([]);
  });
});
