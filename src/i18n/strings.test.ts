import { describe, expect, it } from 'vitest';
import { LEVELS, type PhaseId, buildCycle } from '../engine/pattern';
import { DEFAULT_LOCALE, LOCALES, strings } from './strings';

const PHASES: PhaseId[] = ['inhale', 'sharpInhale', 'exhale'];

describe('i18n', () => {
  it('defaults to Chinese', () => {
    expect(DEFAULT_LOCALE).toBe('zh');
  });

  it('exposes a non-empty string for every phase cue and level in every locale', () => {
    for (const locale of LOCALES) {
      const t = strings(locale);
      for (const phase of PHASES) {
        expect(t.cue[phase].length).toBeGreaterThan(0);
      }
      for (const level of LEVELS) {
        expect(t.levelName[level.id].length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps the same key set across locales', () => {
    const [first, ...rest] = LOCALES.map((locale) => Object.keys(strings(locale)).sort());
    for (const keys of rest) {
      expect(keys).toEqual(first);
    }
  });

  it('formats interpolated strings in both locales', () => {
    for (const locale of LOCALES) {
      const t = strings(locale);
      expect(t.minutes(10)).toContain('10');
      expect(t.levelDetail(3, 7)).toContain('3');
      expect(t.levelDetail(3, 7)).toContain('7');
      expect(t.doneBody(12, 10)).toContain('12');
    }
  });

  it('covers every phase produced by the engine', () => {
    const produced = new Set(buildCycle(LEVELS[0]!).map((phase) => phase.id));
    for (const locale of LOCALES) {
      const t = strings(locale);
      for (const phase of produced) {
        expect(t.cue[phase]).toBeTruthy();
      }
    }
  });

  it('declares a valid html lang for each locale', () => {
    expect(strings('zh').htmlLang).toBe('zh-CN');
    expect(strings('en').htmlLang).toBe('en');
  });
});
