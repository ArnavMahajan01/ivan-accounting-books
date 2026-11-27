import { describe, expect, it } from 'vitest';
import { isAppUrl, isGooglePageUrl } from './navigation';

describe('isAppUrl', () => {
  it('allows only app://bundle in a built app', () => {
    expect(isAppUrl('app://bundle/index.html', null)).toBe(true);
    expect(isAppUrl('app://bundle/other#x', null)).toBe(true);
    for (const url of [
      'app://evil/index.html',
      'https://example.com/',
      'file:///etc/passwd',
      'data:text/html,hi',
      'javascript:alert(1)',
      'http://localhost:5173/',
      'not a url',
    ]) {
      expect(isAppUrl(url, null)).toBe(false);
    }
  });

  it('allows only the exact dev server host in development', () => {
    const dev = 'http://localhost:5173/';
    expect(isAppUrl('http://localhost:5173/index.html', dev)).toBe(true);
    expect(isAppUrl('http://localhost:5174/', dev)).toBe(false);
    expect(isAppUrl('https://localhost:5173/', dev)).toBe(false);
    expect(isAppUrl('http://localhost.evil.com:5173/', dev)).toBe(false);
    expect(isAppUrl('app://bundle/index.html', dev)).toBe(false);
  });
});

describe('the sheet panel may go only to Google’s own pages (spec 118)', () => {
  it('allows the sheet, Google sign-in and their files, over https', () => {
    expect(isGooglePageUrl('https://docs.google.com/spreadsheets/d/abc/edit')).toBe(true);
    expect(isGooglePageUrl('https://accounts.google.com/v3/signin')).toBe(true);
    expect(isGooglePageUrl('https://ssl.gstatic.com/x.js')).toBe(true);
  });

  it('refuses anything else, and look-alikes', () => {
    expect(isGooglePageUrl('http://docs.google.com/')).toBe(false);
    expect(isGooglePageUrl('https://docs.google.com.evil.example/')).toBe(false);
    expect(isGooglePageUrl('https://evilgoogle.com/')).toBe(false);
    expect(isGooglePageUrl('app://bundle/index.html')).toBe(false);
    expect(isGooglePageUrl('javascript:alert(1)')).toBe(false);
  });
});
