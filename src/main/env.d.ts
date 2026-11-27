// The Google client id and secret, put into the main process build from `.env` by electron-vite
// (spec 106). Absent when the app was built without them. Checked by loadEnv in src/shared/env.ts.
interface ImportMetaEnv {
  readonly MAIN_VITE_GOOGLE_CLIENT_ID?: string;
  readonly MAIN_VITE_GOOGLE_CLIENT_SECRET?: string;
}
