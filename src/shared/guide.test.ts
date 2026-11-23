import { describe, expect, it } from 'vitest';
import { guideImages, guideSchema } from './guide';

const good = {
  id: 'bring-in-a-statement',
  title: 'Bring in a Westpac statement',
  group: 'Getting started',
  summary: 'Add your latest Westpac transactions to your books.',
  sections: [
    {
      heading: 'Steps',
      paragraphs: ['Do this on your Mac.'],
      steps: [
        {
          text: 'Click Bank in the sidebar.',
          image: { file: 'bank.png', description: 'The Bank page' },
        },
      ],
    },
  ],
};

describe('guideSchema', () => {
  it('accepts a guide, and fills in missing paragraphs and steps as empty lists', () => {
    const parsed = guideSchema.parse({
      ...good,
      sections: [{ heading: 'About', paragraphs: ['Hello.'] }],
    });
    expect(parsed.sections[0]?.steps).toEqual([]);
    expect(guideSchema.parse(good).sections[0]?.steps[0]?.image?.file).toBe('bank.png');
  });

  it.each([
    [
      'an HTML tag in a step',
      { sections: [{ heading: 'x', steps: [{ text: 'Click <b>Bank</b>.' }] }] },
    ],
    [
      'a script in a paragraph',
      { sections: [{ heading: 'x', paragraphs: ['<script>alert(1)</script>'] }] },
    ],
    ['an empty section', { sections: [{ heading: 'x' }] }],
    ['no sections', { sections: [] }],
    ['a group that does not exist', { group: 'Nowhere' }],
    ['an unknown field', { extra: 'x' }],
    ['an id with capitals or spaces', { id: 'Not Valid' }],
    ['a blank title', { title: '   ' }],
    [
      'an image path that leaves the folder',
      {
        sections: [
          { heading: 'x', steps: [{ text: 'a', image: { file: '../x.png', description: 'd' } }] },
        ],
      },
    ],
    [
      'an SVG image',
      {
        sections: [
          { heading: 'x', steps: [{ text: 'a', image: { file: 'x.svg', description: 'd' } }] },
        ],
      },
    ],
    [
      'an image with no description',
      {
        sections: [
          { heading: 'x', steps: [{ text: 'a', image: { file: 'x.png', description: '' } }] },
        ],
      },
    ],
  ])('refuses %s', (_name, change) => {
    expect(guideSchema.safeParse({ ...good, ...change }).success).toBe(false);
  });

  it('allows a less-than sign that is not a tag', () => {
    expect(
      guideSchema.safeParse({ ...good, summary: 'Amounts under $10 < $20 are fine.' }).success,
    ).toBe(true);
  });
});

describe('guideImages', () => {
  it('lists the images in reading order', () => {
    expect(guideImages(guideSchema.parse(good)).map((i) => i.file)).toEqual(['bank.png']);
  });
});
