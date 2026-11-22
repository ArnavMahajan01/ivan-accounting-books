import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import './Button.css';

export type ButtonVariant = 'default' | 'main' | 'destructive';
export type ButtonSize = 'regular' | 'small';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  /** `main` is the one main action on a view, in the accent colour. Use it once per view. */
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly icon?: LucideIcon;
  readonly children: ReactNode;
}

export function Button({
  variant = 'default',
  size = 'regular',
  icon: Icon,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button {...rest} type={type} className={`button button--${variant} button--${size}`}>
      {Icon !== undefined && <Icon aria-hidden="true" className="button__icon" />}
      <span>{children}</span>
    </button>
  );
}
