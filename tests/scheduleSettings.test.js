import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WEEKDAYS, normalizeScheduleSettings, validateScheduleSettings, scheduleOptions, describeSchedule,
  weekdays, rotationLabel,
} from '../src/lib/scheduleSettings.js';

test('zonder instellingen: di, do, za op volgorde', () => {
  assert.deepEqual(normalizeScheduleSettings(null), { training_days: [2, 4, 6], rotation: 'volgorde' });
});

test('opschonen: ongeldige en dubbele dagen weg, oplopend, onbekende volgorde wordt standaard', () => {
  assert.deepEqual(normalizeScheduleSettings({ training_days: [5, 1, 1, 9, -1, '3'], rotation: 'x' }),
    { training_days: [1, 3, 5], rotation: 'volgorde' });
  assert.deepEqual(normalizeScheduleSettings({ training_days: [], rotation: 'willekeurig' }).training_days, [2, 4, 6]);
});

test('controleren: minstens één dag en een geldige volgorde', () => {
  assert.deepEqual(validateScheduleSettings({ training_days: [1], rotation: 'willekeurig' }), []);
  assert.deepEqual(validateScheduleSettings({ training_days: [], rotation: 'volgorde' }), ['Kies minstens één trainingsdag.']);
  assert.deepEqual(validateScheduleSettings({ training_days: [1], rotation: 'nee' }), ['Kies hoe de workouts rouleren.']);
});

test('opties voor de planning', () => {
  assert.deepEqual(scheduleOptions({ training_days: [3, 1], rotation: 'willekeurig' }), { trainingDays: [1, 3], rotation: 'willekeurig' });
});

test('beschrijving in gewone taal, maandag eerst', () => {
  assert.equal(describeSchedule({ training_days: [2, 4, 6], rotation: 'volgorde' }, 3), 'Dinsdag, donderdag en zaterdag, op volgorde.');
  assert.equal(describeSchedule({ training_days: [0, 1], rotation: 'willekeurig' }, 4),
    'Maandag en zondag, willekeurige volgorde, opnieuw geschud na elke ronde van 4 workouts.');
  assert.equal(describeSchedule({ training_days: [3], rotation: 'volgorde' }, 2), 'Woensdag, op volgorde.');
  assert.equal(WEEKDAYS[0].short, 'ma');
  assert.equal(WEEKDAYS[6].day, 0);
});

test('planning in het Engels', () => {
  assert.equal(describeSchedule({ training_days: [2, 4, 6], rotation: 'volgorde' }, 3, 'en'), 'Tuesday, Thursday and Saturday, in order.');
  assert.equal(describeSchedule({ training_days: [1], rotation: 'willekeurig' }, 4, 'en'), 'Monday, random order, reshuffled after every round of 4 workouts.');
  assert.deepEqual(validateScheduleSettings({ training_days: [], rotation: 'x' }, 'en'), ['Choose at least one training day.', 'Choose how the workouts rotate.']);
  assert.deepEqual(weekdays('en').map((w) => w.short), ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);
  assert.equal(weekdays('nl')[0].label, 'maandag');
  assert.equal(rotationLabel('willekeurig', 'en'), 'Random each round');
});
