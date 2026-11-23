# 027: Help: Guide Format and the Getting Started Guide

Sets how guides are written and stored, and ships the first one, so every later folder adds its guide the same way.

**Client sees:** a "Getting started" guide.

## Depends On

- 026

## Implementation

1. Guides are structured data (title, feature group, sections with steps and optional sample-data images), validated by a schema, stored in `guides/`. Plain text only, never rendered as HTML (as in the Admin Dashboard).
2. Write "Getting started" following `guide-writing-rules.md`: what the app is, the sidebar, where data lives.
3. A test that every guide validates and every image exists.

## Check When Done

- The guide validates. `npm run check` passes.
