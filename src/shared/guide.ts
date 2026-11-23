// The shape of a user guide (context/guide-writing-rules.md). Guides are JSON files in `guides/`.
// They are plain text only: the Help page shows every string as text, never as HTML, and the
// schema refuses anything that looks like a tag so a slip is caught when the tests run.

import { z } from 'zod';

/** The feature groups Help lists guides under, in the order shown. A new folder adds its group here. */
export const GUIDE_GROUPS = ['Getting started', 'Your books'] as const;
export type GuideGroup = (typeof GUIDE_GROUPS)[number];

/** An image is a file in `guides/images/`. SVG is not allowed, because it can carry script. */
export const IMAGE_FILE = /^[a-z0-9][a-z0-9-]*\.(?:png|jpe?g|webp)$/;
export const GUIDE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Each image stays small so the app stays small (guide-writing-rules.md, "Images"). */
export const MAX_IMAGE_BYTES = 300 * 1024;

const looksLikeMarkup = /<\/?[a-zA-Z!]/;

function plainText(max: number) {
  return z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((s) => !looksLikeMarkup.test(s), {
      message: 'Guides are plain text, with no HTML tags',
    });
}

const imageSchema = z.strictObject({
  file: z.string().regex(IMAGE_FILE),
  /** For anyone who cannot see the image. */
  description: plainText(300),
});

const stepSchema = z.strictObject({
  text: plainText(400),
  image: imageSchema.optional(),
});

const sectionSchema = z
  .strictObject({
    heading: plainText(100),
    paragraphs: z.array(plainText(600)).default([]),
    steps: z.array(stepSchema).default([]),
  })
  .refine((s) => s.paragraphs.length + s.steps.length > 0, {
    message: 'A section needs a paragraph or a step',
  });

export const guideSchema = z.strictObject({
  /** Also the file name, and the address of the guide in Help. */
  id: z.string().regex(GUIDE_ID),
  title: plainText(100),
  group: z.enum(GUIDE_GROUPS),
  /** One sentence on what the guide helps with. */
  summary: plainText(240),
  sections: z.array(sectionSchema).min(1).max(12),
});

export type Guide = z.output<typeof guideSchema>;
export type GuideSection = Guide['sections'][number];
export type GuideStep = GuideSection['steps'][number];
export type GuideImage = NonNullable<GuideStep['image']>;

/** Every image a guide uses, in reading order. */
export function guideImages(guide: Guide): GuideImage[] {
  return guide.sections.flatMap((section) =>
    section.steps.flatMap((step) => (step.image === undefined ? [] : [step.image])),
  );
}
