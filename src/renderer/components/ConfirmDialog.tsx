import { Button } from './Button';
import { Sheet } from './Sheet';

export interface ConfirmDialogProps {
  readonly title: string;
  /** What will change, in plain words. */
  readonly change: string;
  /** The action in words, such as "Stop sharing". Never "OK" or "Yes". */
  readonly confirmLabel: string;
  readonly destructive?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/** A confirmation that says what will change. Cancel comes first and has focus. */
export function ConfirmDialog({
  title,
  change,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Sheet
      title={title}
      description={change}
      role="alertdialog"
      onClose={onCancel}
      actions={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant={destructive ? 'destructive' : 'main'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
