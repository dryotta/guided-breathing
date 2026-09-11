import { LEVELS, type LevelId } from '../engine/pattern';
import { LOCALES, type Locale, strings } from '../i18n/strings';
import { DURATION_MINUTES, type DurationMinutes, type Settings } from '../state/settings';
import { el } from './dom';

export interface SettingsScreenHandlers {
  readonly onChange: (patch: Partial<Settings>, focusKey: string) => void;
  readonly onStart: () => void;
}

interface OptionSpec<T> {
  readonly value: T;
  readonly label: string;
  readonly hint?: string;
}

function optionGroup<T extends string | number>(
  name: string,
  label: string,
  options: readonly OptionSpec<T>[],
  selected: T,
  onSelect: (value: T, focusKey: string) => void,
): HTMLElement {
  const keyFor = (value: T): string => `${name}:${value}`;

  const buttons = options.map((option) => {
    const isSelected = option.value === selected;
    const button = el(
      'button',
      {
        type: 'button',
        class: 'option',
        role: 'radio',
        'aria-checked': String(isSelected),
        tabindex: isSelected ? 0 : -1,
        'data-key': keyFor(option.value),
      },
      [el('span', { class: 'option-label' }, [option.label])],
    );
    if (option.hint) button.append(el('span', { class: 'option-hint' }, [option.hint]));
    button.addEventListener('click', () => onSelect(option.value, keyFor(option.value)));
    return button;
  });

  const group = el('div', { class: 'option-group', role: 'radiogroup', 'aria-label': label }, buttons);

  // Arrow-key navigation, as expected for a radio group.
  group.addEventListener('keydown', (event) => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === selected);
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const next = options[(index + delta + options.length) % options.length];
    if (next) onSelect(next.value, keyFor(next.value));
  });

  return el('section', { class: 'field' }, [el('h2', { class: 'field-label' }, [label]), group]);
}

export function renderSettingsScreen(
  settings: Settings,
  handlers: SettingsScreenHandlers,
): HTMLElement {
  const t = strings(settings.locale);

  const durations: OptionSpec<DurationMinutes>[] = DURATION_MINUTES.map((minutes) => ({
    value: minutes,
    label: t.minutes(minutes),
  }));

  const locales: OptionSpec<Locale>[] = LOCALES.map((locale) => ({
    value: locale,
    label: strings(locale).localeName,
  }));

  const levels: OptionSpec<LevelId>[] = LEVELS.map((level) => ({
    value: level.id,
    label: t.levelName[level.id],
    hint: t.levelDetail(level.inhaleMs / 1000, level.exhaleMs / 1000),
  }));

  const start = el('button', { type: 'button', class: 'primary-button' }, [t.start]);
  start.addEventListener('click', handlers.onStart);

  return el('main', { class: 'screen screen-settings' }, [
    el('header', { class: 'intro' }, [
      el('div', { class: 'intro-mark', 'aria-hidden': 'true' }),
      el('h1', { class: 'intro-title' }, [t.appTitle]),
      el('p', { class: 'intro-tagline' }, [t.appTagline]),
    ]),
    el('div', { class: 'fields' }, [
      optionGroup(
        'duration',
        t.durationLabel,
        durations,
        settings.durationMinutes,
        (durationMinutes, key) => handlers.onChange({ durationMinutes }, key),
      ),
      optionGroup('level', t.levelLabel, levels, settings.level, (level, key) =>
        handlers.onChange({ level }, key),
      ),
      optionGroup('locale', t.languageLabel, locales, settings.locale, (locale, key) =>
        handlers.onChange({ locale }, key),
      ),
    ]),
    el('div', { class: 'actions' }, [start]),
  ]);
}
