// Spec 027: every guide in guides/ validates, and every image it names exists.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MAX_IMAGE_BYTES } from '@shared/guide';
import { findGuideProblems } from './guide-problems.ts';

describe('the real guides', () => {
  it('all validate, and every image exists', () => {
    expect(findGuideProblems('guides')).toEqual([]);
  });
});

describe('findGuideProblems', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'guides-test-'));
    mkdirSync(join(dir, 'images'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const guide = (over: Record<string, unknown> = {}) => ({
    id: 'sample-guide',
    title: 'A sample guide',
    group: 'Getting started',
    summary: 'Shows how a guide is written.',
    sections: [
      {
        heading: 'Steps',
        steps: [{ text: 'Click Home.', image: { file: 'home.png', description: 'The Home page' } }],
      },
    ],
    ...over,
  });
  const write = (name: string, content: unknown) => {
    writeFileSync(join(dir, name), typeof content === 'string' ? content : JSON.stringify(content));
  };

  it('passes a good guide whose image exists', () => {
    write('sample-guide.json', guide());
    writeFileSync(join(dir, 'images', 'home.png'), 'image bytes');
    expect(findGuideProblems(dir)).toEqual([]);
  });

  it('names a missing image', () => {
    write('sample-guide.json', guide());
    expect(findGuideProblems(dir)).toEqual([
      'sample-guide.json: the image home.png does not exist in images/',
    ]);
  });

  it('names an image that is too big', () => {
    write('sample-guide.json', guide());
    writeFileSync(join(dir, 'images', 'home.png'), Buffer.alloc(MAX_IMAGE_BYTES + 1));
    expect(findGuideProblems(dir)).toHaveLength(1);
  });

  it('names a file that is not JSON, and a guide that fails the schema', () => {
    write('broken.json', '{ not json');
    write('sample-guide.json', guide({ group: 'Nowhere', sections: [] }));
    const problems = findGuideProblems(dir);
    expect(problems).toContain('broken.json: not valid JSON');
    expect(problems.some((p) => p.startsWith('sample-guide.json: group'))).toBe(true);
    expect(problems.some((p) => p.startsWith('sample-guide.json: sections'))).toBe(true);
  });

  it('names a guide whose id does not match its file name', () => {
    write('other-name.json', guide({ sections: [{ heading: 'Hi', paragraphs: ['Hello.'] }] }));
    expect(findGuideProblems(dir)).toEqual([
      'other-name.json: the id "sample-guide" must match the file name',
    ]);
  });
});
