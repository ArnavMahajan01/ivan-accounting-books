import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.getElementById('root');
if (container === null) throw new Error('The page has no #root element');
const root = createRoot(container);

async function start(): Promise<void> {
  // The components page exists only while developing. Vite drops this branch from the build.
  if (import.meta.env.DEV && location.hash === '#components') {
    const { ComponentsPage } = await import('./dev/ComponentsPage');
    root.render(
      <StrictMode>
        <ComponentsPage />
      </StrictMode>,
    );
    return;
  }
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
