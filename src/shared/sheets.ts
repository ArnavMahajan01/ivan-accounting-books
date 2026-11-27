// What the screens are told about Google and the published sheets (folder 09). Never a token.

/** Why connecting did not work, in the words Settings uses. */
export type ConnectProblem =
  /** Built without a Google client id (spec 106). */
  | 'not-set-up'
  /** He closed the browser page, said no, or took longer than five minutes. */
  | 'cancelled'
  | 'offline'
  /** He unticked "see and edit the files this app makes" on Google's page. */
  | 'scope-refused'
  /** The Mac's Keychain could not keep the sign-in. */
  | 'no-keychain'
  /** A sign-in is already open in the browser. */
  | 'busy'
  | 'failed';

/** The Google connection, as Settings and the banner show it. */
export type GoogleStatus =
  /** The app was built without a Google client id (spec 106). */
  | { readonly kind: 'not-set-up' }
  | { readonly kind: 'not-connected' }
  | { readonly kind: 'connected'; readonly email: string | null }
  /** The sign-in expired or was taken back: "Google needs you to sign in again". */
  | { readonly kind: 'needs-sign-in'; readonly email: string | null };
