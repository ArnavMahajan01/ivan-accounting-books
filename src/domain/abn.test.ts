import { describe, expect, it } from 'vitest';
import { parseAbn } from './abn';

describe('parseAbn', () => {
  it('accepts the Australian Business Register worked example, with or without spaces', () => {
    expect(parseAbn('51 824 753 556')).toEqual({ ok: true, value: '51824753556' });
    expect(parseAbn('51824753556')).toEqual({ ok: true, value: '51824753556' });
  });

  it('accepts the invented ABN the sample business uses', () => {
    expect(parseAbn('35 482 916 037')).toEqual({ ok: true, value: '35482916037' });
  });

  it('refuses a number whose check digits do not work out', () => {
    expect(parseAbn('51824753557')).toEqual({ ok: false, error: { code: 'bad-check-digits' } });
    expect(parseAbn('11111111111')).toEqual({ ok: false, error: { code: 'bad-check-digits' } });
  });

  it('subtracts 1 from the first digit, so a valid number with the first digit changed fails', () => {
    expect(parseAbn('61824753556')).toEqual({ ok: false, error: { code: 'bad-check-digits' } });
  });

  it.each(['', '5182475355', '518247535566', '5182475355a', '51-824-753-556', '51.824.753.556'])(
    'refuses "%s" as not 11 digits',
    (text) => {
      expect(parseAbn(text)).toEqual({ ok: false, error: { code: 'not-11-digits' } });
    },
  );
});
