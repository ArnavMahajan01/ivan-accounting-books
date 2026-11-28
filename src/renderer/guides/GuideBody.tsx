// A guide's sections, steps and images (spec 027), shared by Help's reading page and the "? Help"
// panel on each page (spec 135). Plain text only: a guide is never drawn as HTML.

import type { Guide } from '@shared/guide';
import { guideImageUrl } from './load-guides';

export function GuideBody({ guide }: { readonly guide: Guide }) {
  return (
    <>
      {guide.sections.map((section, sectionIndex) => (
        <section key={sectionIndex} className="help-reader__section">
          <h2 className="help-reader__heading">{section.heading}</h2>
          {section.paragraphs.map((text, index) => (
            <p key={index} className="help-reader__text">
              {text}
            </p>
          ))}
          {section.steps.length > 0 && (
            <ol className="help-reader__steps">
              {section.steps.map((step, index) => {
                const url = step.image === undefined ? undefined : guideImageUrl(step.image.file);
                return (
                  <li key={index}>
                    {step.text}
                    {step.image !== undefined && url !== undefined && (
                      <img src={url} alt={step.image.description} className="help-reader__image" />
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ))}
    </>
  );
}
