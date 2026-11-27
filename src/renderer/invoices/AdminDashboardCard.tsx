// The Admin Dashboard card in Settings (spec 127; W08a, Option 2): the folder the Admin Dashboard
// writes invoices to, chosen once. Only the folder's name is shown here, never its path.

import { FolderSync } from 'lucide-react';
import { useEffect, useState } from 'react';
import { bridge } from '../bridge';
import { Button } from '../components/Button';

export function AdminDashboardCard() {
  const [folder, setFolder] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const api = bridge();
    void api['invoices.folder']({}).then((result) => {
      if (result.ok) setFolder(result.value.folderName);
    });
  }, []);

  const choose = async () => {
    const result = await bridge()['invoices.chooseFolder']({});
    if (result.ok) setFolder(result.value.folderName);
  };
  const unlink = async () => {
    const result = await bridge()['invoices.unlinkFolder']({});
    if (result.ok) setFolder(null);
  };

  return (
    <section className="page-surface settings-card" aria-labelledby="settings-admin-dashboard">
      <h2 id="settings-admin-dashboard" className="settings-card__title">
        <FolderSync aria-hidden="true" className="settings-card__icon" />
        Admin Dashboard
      </h2>
      {folder === undefined && <p aria-busy="true">Checking…</p>}
      {folder === null && <p className="settings-card__line">Not linked</p>}
      {typeof folder === 'string' && (
        <p className="settings-card__line" data-testid="invoice-folder">
          Shared folder: {folder}
        </p>
      )}
      <p className="settings-card__line settings-card__line--secondary">
        The Admin Dashboard writes to this folder when it issues an invoice, and new invoices wait
        on the Invoices page for you to add. Both apps stay on this Mac.
      </p>
      <div className="settings-card__actions">
        <Button onClick={() => void choose()}>
          {folder === null ? 'Choose folder…' : 'Change folder…'}
        </Button>
        {typeof folder === 'string' && <Button onClick={() => void unlink()}>Stop linking</Button>}
      </div>
    </section>
  );
}
