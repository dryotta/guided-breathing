import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  type Settings,
  loadSettings,
  normaliseSettings,
  saveSettings,
} from './settings';

function memoryStorage(seed: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(seed));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  };
}

function throwingStorage(): Storage {
  const fail = (): never => {
    throw new Error('storage disabled');
  };
  return {
    get length(): number {
      return fail();
    },
    clear: fail,
    getItem: fail,
    key: fail,
    removeItem: fail,
    setItem: fail,
  };
}

const KEY = 'guided-breathing:settings:v1';

describe('defaults', () => {
  it('is 10 minutes, Chinese, relax', () => {
    expect(DEFAULT_SETTINGS).toEqual({ durationMinutes: 10, locale: 'zh', level: 'relax' });
  });
});

describe('normaliseSettings', () => {
  it('accepts valid settings unchanged', () => {
    const input: Settings = { durationMinutes: 15, locale: 'en', level: 'elite' };
    expect(normaliseSettings(input)).toEqual(input);
  });

  it('falls back per field for invalid values', () => {
    expect(normaliseSettings({ durationMinutes: 7, locale: 'fr', level: 'impossible' })).toEqual(
      DEFAULT_SETTINGS,
    );
    expect(normaliseSettings({ durationMinutes: 5, locale: 'fr' })).toEqual({
      ...DEFAULT_SETTINGS,
      durationMinutes: 5,
    });
  });

  it('handles non-object input', () => {
    expect(normaliseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normaliseSettings('nope')).toEqual(DEFAULT_SETTINGS);
    expect(normaliseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('rejects a numeric string duration', () => {
    expect(normaliseSettings({ durationMinutes: '15' }).durationMinutes).toBe(10);
  });
});

describe('loadSettings / saveSettings', () => {
  it('round-trips through storage', () => {
    const storage = memoryStorage();
    const settings: Settings = { durationMinutes: 15, locale: 'en', level: 'hard' };

    saveSettings(settings, storage);
    expect(loadSettings(storage)).toEqual(settings);
  });

  it('returns defaults when nothing is stored', () => {
    expect(loadSettings(memoryStorage())).toEqual(DEFAULT_SETTINGS);
  });

  it('returns defaults for corrupt JSON', () => {
    expect(loadSettings(memoryStorage({ [KEY]: '{not json' }))).toEqual(DEFAULT_SETTINGS);
  });

  it('repairs partially invalid stored settings', () => {
    const storage = memoryStorage({
      [KEY]: JSON.stringify({ durationMinutes: 15, locale: 'klingon', level: 'easy' }),
    });
    expect(loadSettings(storage)).toEqual({ durationMinutes: 15, locale: 'zh', level: 'easy' });
  });

  it('survives storage being unavailable', () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(throwingStorage())).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS, null)).not.toThrow();
    expect(() => saveSettings(DEFAULT_SETTINGS, throwingStorage())).not.toThrow();
  });

  it('does not hand back a shared reference to the defaults', () => {
    const loaded = loadSettings(null);
    loaded.durationMinutes = 5;
    expect(DEFAULT_SETTINGS.durationMinutes).toBe(10);
  });
});
