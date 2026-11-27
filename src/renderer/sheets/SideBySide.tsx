// Open side by side (spec 119; W07a, Option 1): opens the workbook in his web browser; the screen
// then says in one sentence how the Mac puts two windows side by side. The app never moves
// another app's window.

import { Columns2 } from 'lucide-react';
import { bridge } from '../bridge';
import { Button } from '../components/Button';

export const SIDE_BY_SIDE_HOW =
  'To work side by side, hold the pointer over the green button at the top left of the Chrome window, choose Move & Resize, then Left & Right, and pick Accounting Books for the other half.';

export function SideBySide({
  linkId,
  onOpen,
}: {
  readonly linkId: string;
  readonly onOpen: () => void;
}) {
  return (
    <Button
      icon={Columns2}
      onClick={() => {
        void bridge()['sheets.open']({ linkId });
        onOpen();
      }}
    >
      Open side by side
    </Button>
  );
}
