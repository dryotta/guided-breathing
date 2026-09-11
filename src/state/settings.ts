import { DEFAULT_LEVEL_ID, LEVELS, type LevelId } from '../engine/pattern';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '../i18n/strings';

export const DURATION_MINUTES = [5, 10, 15] as const;
export type DurationMinutes = (typeof DURATION_MINUTES)[number];

export interface Settings {
  durationMinutes: DurationMinutes;
  locale: Locale;
  level: LevelId;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  durationMinutes: 10,
  locale: DEFAULT_LOCALE,
  level: DEFAULT_LEVEL_ID,
};

const STORAGE_KEY = 'guided-breathing:settings:v1';

function isDuration(value: unknown): value is DurationMinutes {
  return DURATION_MINUTES.some((minutes) => minutes === value);
}

function isLocale(value: unknown): value is Locale {
  return LOCALES.some((locale) => locale === value);
}

function isLevel(value: unknown): value is LevelId {
  return LEVELS.some((level) => level.id === value);
}

/** Coerce anything into valid settings, falling back per-field. */
export function normaliseSettings(input: unknown): Settings {
  const record = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  return {
    durationMinutes: isDuration(record['durationMinutes'])
      ? record['durationMinutes']
      : DEFAULT_SETTINGS.durationMinutes,
    locale: isLocale(record['locale']) ? record['locale'] : DEFAULT_SETTINGS.locale,
    level: isLevel(record['level']) ? record['level'] : DEFAULT_SETTINGS.level,
  };
}

/**
 * `localStorage` access throws in Safari private mode and when cookies are
 * blocked, so every call site tolerates the storage being unavailable.
 */
function defaultStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadSettings(storage: Storage | null = defaultStorage()): Settings {
  if (!storage) return { ...DEFAULT_SETTINGS };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return normaliseSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings, storage: Storage | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Quota exceeded or storage disabled — settings just won't persist.
  }
}
