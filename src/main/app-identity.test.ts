import { describe, expect, it } from 'vitest';
import { dataFolder, runName } from './app-identity';

describe('runName', () => {
  it('adds " Dev" to every run that is not packaged', () => {
    expect(runName('Accounting Books', false)).toBe('Accounting Books Dev');
  });

  it('keeps the product name for the packaged app', () => {
    expect(runName('Accounting Books', true)).toBe('Accounting Books');
  });

  it('never adds the suffix twice', () => {
    expect(runName('Accounting Books Dev', false)).toBe('Accounting Books Dev');
  });
});

describe('dataFolder', () => {
  it('is a folder named after the app in the application data folder', () => {
    expect(dataFolder('/Users/sample/Library/Application Support', 'Accounting Books Dev')).toBe(
      '/Users/sample/Library/Application Support/Accounting Books Dev',
    );
  });
});
