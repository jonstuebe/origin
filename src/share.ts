import { Option } from 'effect'

import { type DayProgress, type Fact } from './domain'

export const SITE_URL = 'https://origin.jonstuebe.com'

/** The spoiler-free text a reader shares: the question, their verdict and streak, never the answer. */
export const shareText = (
  fact: Fact,
  day: DayProgress,
  streakDays: number,
): string =>
  [
    `Origin No. ${fact.number}`,
    fact.question,
    Option.match(day.maybeVerdict, {
      onNone: () => 'Read today’s origin',
      onSome: verdict =>
        verdict === 'Knew' ? 'Knew it ✓' : 'Learned something new ✦',
    }),
    `Streak: ${streakDays}`,
    SITE_URL,
  ].join('\n')
