import type { Strings } from '../i18n/strings';
import { el } from './dom';

export interface CompleteScreenHandlers {
  readonly onAgain: () => void;
  readonly onSettings: () => void;
}

export function renderCompleteScreen(
  t: Strings,
  minutes: number,
  cycles: number,
  handlers: CompleteScreenHandlers,
): HTMLElement {
  const again = el('button', { type: 'button', class: 'primary-button' }, [t.again]);
  again.addEventListener('click', handlers.onAgain);

  const settings = el('button', { type: 'button', class: 'ghost-button' }, [t.backToSettings]);
  settings.addEventListener('click', handlers.onSettings);

  return el('main', { class: 'screen screen-complete' }, [
    el('div', { class: 'complete-mark', 'aria-hidden': 'true' }),
    el('h1', { class: 'complete-title' }, [t.doneTitle]),
    el('p', { class: 'complete-body' }, [t.doneBody(cycles, minutes)]),
    el('div', { class: 'actions' }, [again, settings]),
  ]);
}
