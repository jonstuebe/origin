import { Option } from 'effect'
import {
  Command,
  click,
  expect,
  given,
  inside,
  role,
  scene,
  text,
} from 'foldkit/scene'
import { describe, test } from 'vitest'

import { SaveProgress, ShareResult } from './command'
import { ArchiveAsyncData, FactAsyncData, FetchError } from './domain'
import { Message, update, view } from './main'
import { archiveOnNov6, fact1, fact2, modelWith } from './main.fixture'
import { AppRoute } from './route'

describe('today', () => {
  test('shows the question and hides the answer until revealed', () => {
    scene(
      { update, view },
      given(modelWith()),
      expect(role('heading', { name: fact2.question })).toExist(),
      expect(text('Take a guess before you look.')).toExist(),
      expect(text(fact2.headline)).toBeAbsent(),
      click(role('button', { name: 'Reveal the answer' })),
      Command.resolve(SaveProgress, Message.CompletedSaveProgress()),
      expect(text(fact2.headline)).toExist(),
      expect(role('button', { name: 'Reveal the answer' })).toBeAbsent(),
      expect(role('button', { name: 'Share today’s result' })).toBeAbsent(),
    )
  })

  test('picking a verdict marks it and offers sharing', () => {
    scene(
      { update, view },
      given(modelWith()),
      click(role('button', { name: 'Reveal the answer' })),
      Command.resolve(SaveProgress, Message.CompletedSaveProgress()),
      click(role('button', { name: 'I knew it' })),
      Command.resolve(SaveProgress, Message.CompletedSaveProgress()),
      expect(role('button', { name: 'I knew it' })).toHaveAttr(
        'aria-pressed',
        'true',
      ),
      expect(role('button', { name: 'Share today’s result' })).toExist(),
      inside(
        role('region', { name: 'Your stats' }),
        expect(text('1 day streak')).toExist(),
        expect(text('1 already knew')).toExist(),
        expect(text('Next in 03:04:09')).toExist(),
      ),
    )
  })

  test('shows the date and edition number', () => {
    scene(
      { update, view },
      given(modelWith()),
      expect(text('No. 2')).toExist(),
      expect(text('November 6')).toExist(),
    )
  })

  test('says to come back tomorrow when there is no fact', () => {
    scene(
      { update, view },
      given(
        modelWith({
          todayFact: FactAsyncData.Failure({
            error: FetchError.NotPublished(),
          }),
        }),
      ),
      expect(role('heading', { name: 'Nothing new today.' })).toExist(),
      expect(text('Back tomorrow.')).toExist(),
    )
  })

  test('offers a retry when offline', () => {
    scene(
      { update, view },
      given(
        modelWith({
          todayFact: FactAsyncData.Failure({ error: FetchError.Unreachable() }),
        }),
      ),
      expect(role('button', { name: 'Try again' })).toExist(),
    )
  })
})

describe('past editions', () => {
  test('show the answer straight away with links back', () => {
    scene(
      { update, view },
      given(
        modelWith({
          route: AppRoute.Edition({ number: 1 }),
          pastFact: FactAsyncData.Success({ data: fact1 }),
        }),
      ),
      expect(role('heading', { name: fact1.question })).toExist(),
      expect(text(fact1.headline)).toExist(),
      expect(role('link', { name: 'Back to archives' })).toHaveAttr(
        'href',
        '/archive',
      ),
      expect(text('No. 1')).toExist(),
      expect(text('November 5')).toExist(),
    )
  })

  test('a future edition is not shown', () => {
    scene(
      { update, view },
      given(modelWith({ route: AppRoute.Edition({ number: 9 }) })),
      expect(role('heading', { name: 'That one isn’t out yet.' })).toExist(),
      expect(text('No. 9')).toBeAbsent(),
    )
  })
})

describe('archives', () => {
  test('list every past question with a link to it', () => {
    scene(
      { update, view },
      given(
        modelWith({
          route: AppRoute.Archive(),
          archive: ArchiveAsyncData.Success({ data: archiveOnNov6 }),
        }),
      ),
      expect(role('heading', { name: 'Archives' })).toExist(),
      expect(role('link', { name: /ship’s speed/ })).toHaveAttr(
        'href',
        '/no/1',
      ),
      expect(text('Nov 5')).toExist(),
    )
  })
})

test('share outcome shows a toast', () => {
  scene(
    { update, view },
    given(
      modelWith({
        progress: {
          days: { '2': { isRevealed: true, maybeVerdict: Option.some('New') } },
        },
      }),
    ),
    click(role('button', { name: 'Share today’s result' })),
    Command.resolve(
      ShareResult,
      Message.CompletedShareResult({ outcome: 'Copied' }),
    ),
    expect(text('Copied')).toExist(),
  )
})
