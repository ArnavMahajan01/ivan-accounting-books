// Whether this build can load and clear sample data. True while the app is shown to the client in
// demos. The release build for go-live sets it to false (spec 150), which hides the Developer
// section in Settings and the first-launch choice, and makes the main process refuse both calls.
export const SAMPLE_DATA_SWITCH = true;
