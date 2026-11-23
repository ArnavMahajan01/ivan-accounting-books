import { describe, expect, it } from 'vitest';
import { dataFolder, parseDataDirArg, runName } from './app-identity';

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

describe('parseDataDirArg', () => {
  it('gives the folder in an unpackaged run', () => {
    expect(parseDataDirArg(['app', '--data-dir=/tmp/try-it'], false)).toBe('/tmp/try-it');
  });

  it('is off without the flag, and never honoured by the packaged app', () => {
    expect(parseDataDirArg(['app'], false)).toBeNull();
    expect(parseDataDirArg(['app', '--data-dir=/tmp/try-it'], true)).toBeNull();
  });

  it('refuses a relative folder', () => {
    expect(parseDataDirArg(['app', '--data-dir=books'], false)).toBeNull();
    expect(parseDataDirArg(['app', '--data-dir='], false)).toBeNull();
  });
});
