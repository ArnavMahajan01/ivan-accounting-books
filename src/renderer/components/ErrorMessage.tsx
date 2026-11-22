import { CircleAlert, RotateCw } from 'lucide-react';
import { Button } from './Button';
import './ErrorMessage.css';

export interface ErrorMessageProps {
  /** Plain words: what went wrong and what to do. Never raw error text. */
  readonly message: string;
  readonly onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="error-message" role="alert">
      <CircleAlert aria-hidden="true" className="error-message__icon" />
      <p className="error-message__text">{message}</p>
      {onRetry !== undefined && (
        <Button size="small" icon={RotateCw} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
