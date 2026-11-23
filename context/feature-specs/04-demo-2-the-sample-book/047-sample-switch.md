# 047: Load and Clear Sample Data

A way to load the sample books into the app for a demo, and remove them, with the "Sample data" label on every screen while they are loaded.

**Client sees:** "Sample data" on every screen during demos.

## Depends On

- 046

## Implementation

1. On first launch with empty books: "Start with sample data" or "Start my own books" (his own books start at go-live, so this is the author's choice in demos).
2. Settings, Developer section (packaged demo builds only, hidden at go-live): "Load sample data" and "Clear all data" with a confirmation.
3. Sample books are stored in a separate file from real books, so clearing them can never touch real data.
4. `SampleDataLabel` shows in every page toolbar while sample data is loaded.

## Check When Done

- Load, see the label everywhere, clear, see empty pages. Real and sample files are separate (checked in the data folder).
- `npm run test:e2e` covers load and clear. `npm run check` passes.
