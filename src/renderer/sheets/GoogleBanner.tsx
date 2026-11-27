// Shown above every page when Google needs him to sign in again (spec 108). It never fails
// silently: publishing and the sheet check wait until he does.

import { TriangleAlert } from 'lucide-react';
import { routeHref } from '../routes';
import { useGoogleState } from './google-state';
import './sheets.css';

export function GoogleBanner() {
  const { status } = useGoogleState();
  if (status?.kind !== 'needs-sign-in') return null;
  return (
    <div className="google-banner" role="status">
      <TriangleAlert aria-hidden="true" className="google-banner__icon" />
      <p className="google-banner__text">
        Google needs you to sign in again. Your sheets are safe in Google Drive; publishing and
        checking for your accountant&apos;s changes wait until you do.
      </p>
      <a className="google-banner__link" href={routeHref('settings')}>
        Sign in again in Settings
      </a>
    </div>
  );
}
