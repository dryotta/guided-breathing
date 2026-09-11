import type { LevelId, PhaseId } from '../engine/pattern';

export const LOCALES = ['zh', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'zh';

export interface Strings {
  readonly htmlLang: string;
  readonly localeName: string;
  readonly appTitle: string;
  readonly appTagline: string;

  readonly durationLabel: string;
  readonly languageLabel: string;
  readonly levelLabel: string;
  readonly minutes: (value: number) => string;
  readonly levelName: Readonly<Record<LevelId, string>>;
  readonly levelDetail: (inhaleSeconds: number, exhaleSeconds: number) => string;
  readonly start: string;

  readonly sessionTitle: string;
  readonly cue: Readonly<Record<PhaseId, string>>;
  readonly paused: string;
  readonly close: string;
  readonly pause: string;
  readonly resume: string;

  readonly doneTitle: string;
  readonly doneBody: (cycles: number, minutes: number) => string;
  readonly again: string;
  readonly backToSettings: string;
}

const zh: Strings = {
  htmlLang: 'zh-CN',
  localeName: '中文',
  appTitle: '引导呼吸',
  appTagline: '生理性叹息 · 快速平复身心',

  durationLabel: '时长',
  languageLabel: '语言',
  levelLabel: '节奏',
  minutes: (value) => `${value} 分钟`,
  levelName: {
    relax: '放松',
    easy: '轻松',
    intermediate: '进阶',
    hard: '困难',
    elite: '精英',
  },
  levelDetail: (inhale, exhale) => `吸气 ${inhale} 秒 · 呼气 ${exhale} 秒`,
  start: '开始练习',

  sessionTitle: '放松身心',
  cue: {
    inhale: '用鼻子吸气',
    sharpInhale: '再短促地吸一口气',
    exhale: '用嘴巴缓缓呼气，把肺里的气排空',
  },
  paused: '已暂停',
  close: '结束练习',
  pause: '暂停',
  resume: '继续',

  doneTitle: '练习完成',
  doneBody: (cycles, minutes) => `${minutes} 分钟，约 ${cycles} 次呼吸循环。感受一下此刻的身体。`,
  again: '再来一次',
  backToSettings: '返回设置',
};

const en: Strings = {
  htmlLang: 'en',
  localeName: 'English',
  appTitle: 'Guided Breathing',
  appTagline: 'Physiological sigh · Reset your nervous system',

  durationLabel: 'Session length',
  languageLabel: 'Language',
  levelLabel: 'Pace',
  minutes: (value) => `${value} min`,
  levelName: {
    relax: 'Relax',
    easy: 'Easy',
    intermediate: 'Intermediate',
    hard: 'Hard',
    elite: 'Elite',
  },
  levelDetail: (inhale, exhale) => `${inhale}s in · ${exhale}s out`,
  start: 'Begin',

  sessionTitle: 'Increase Relaxation',
  cue: {
    inhale: 'Inhale through the nose',
    sharpInhale: 'One more sharp inhale through the nose',
    exhale: 'Exhale slowly through the mouth and empty your lungs',
  },
  paused: 'Paused',
  close: 'End session',
  pause: 'Pause',
  resume: 'Resume',

  doneTitle: 'Session complete',
  doneBody: (cycles, minutes) =>
    `${minutes} minutes, about ${cycles} breath cycles. Notice how you feel.`,
  again: 'Breathe again',
  backToSettings: 'Settings',
};

const TABLE: Readonly<Record<Locale, Strings>> = { zh, en };

export function strings(locale: Locale): Strings {
  return TABLE[locale];
}
