import { CircleCheck } from 'lucide-react';
import type { NextStep } from '@shared/views';
import { Button } from '../components/Button';
import { routeHref } from '../routes';
import { describeStep } from './next-step-text';
import './HomePage.css';

export interface NextStepsListProps {
  readonly steps: readonly NextStep[];
  readonly upToDate: boolean;
}

/** Home's to-do list (wireframe W03, Option 2): one job per row, with one button. Done jobs are ticked. */
export function NextStepsList({ steps, upToDate }: NextStepsListProps) {
  if (steps.length === 0) {
    return (
      <div className="home-todo__empty">
        <CircleCheck aria-hidden="true" className="home-todo__empty-icon" />
        <p className="home-todo__empty-title">You are up to date.</p>
        <p className="home-todo__empty-note">
          Jobs, such as reviewing bank lines, appear here when there is something to do.
        </p>
      </div>
    );
  }
  return (
    <>
      <ol className="home-todo__list">
        {steps.map((step, index) => {
          const text = describeStep(step);
          const done = step.state === 'done';
          return (
            <li key={`${step.id}-${String(index)}`} className="home-todo__row">
              {done ? (
                <CircleCheck aria-label="Done" className="home-todo__tick" />
              ) : (
                <span className="home-todo__number" aria-hidden="true">
                  {index + 1}
                </span>
              )}
              <div className="home-todo__text">
                <span
                  className={done ? 'home-todo__title home-todo__title--done' : 'home-todo__title'}
                >
                  {text.title}
                </span>
                <span className="home-todo__detail">{text.detail}</span>
              </div>
              {text.action !== null && (
                <Button
                  size="small"
                  onClick={() => {
                    window.location.hash = routeHref(text.action?.route ?? 'home');
                  }}
                >
                  {text.action.label}
                </Button>
              )}
            </li>
          );
        })}
      </ol>
      {upToDate && <p className="home-todo__caught-up">You are up to date.</p>}
    </>
  );
}
