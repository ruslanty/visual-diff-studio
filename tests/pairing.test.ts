import assert from 'node:assert/strict'
import test from 'node:test'
import { matchScreenshots } from '../src/pairing.ts'

const named = (...names: string[]) => names.map((name) => ({ name }))

test('pairs single-file uploads regardless of their filenames', () => {
  const matched = matchScreenshots(named('old.png'), named('new.webp'), true)
  assert.deepEqual(matched.pairs.map(({ before, after }) => [before.name, after.name]), [
    ['old.png', 'new.webp'],
  ])
  assert.deepEqual(matched.unmatched, [])
})

test('matches batches by case-insensitive stem and keeps the before order', () => {
  const matched = matchScreenshots(
    named('Settings.dark.PNG', 'Home.jpeg', 'Only before.png'),
    named('home.webp', 'settings.dark.jpg', 'Only after.png'),
  )
  assert.deepEqual(matched.pairs.map(({ name, after }) => [name, after.name]), [
    ['Settings.dark', 'settings.dark.jpg'],
    ['Home', 'home.webp'],
  ])
  assert.deepEqual(matched.unmatched.map(({ side, file }) => [side, file.name]), [
    ['before', 'Only before.png'],
    ['after', 'Only after.png'],
  ])
})

test('leaves ambiguous stems unmatched', () => {
  const matched = matchScreenshots(named('Home.png', 'home.webp', 'Profile.png'), named('Home.jpg', 'profile.png'))
  assert.deepEqual(matched.pairs.map(({ name }) => name), ['Profile'])
  assert.deepEqual(matched.unmatched.map(({ file }) => file.name), ['Home.png', 'home.webp', 'Home.jpg'])
})

test('waits for the other side and reports all files as unmatched', () => {
  const matched = matchScreenshots([], named('home.png', 'profile.png'))
  assert.deepEqual(matched.pairs, [])
  assert.equal(matched.unmatched.length, 2)
})
