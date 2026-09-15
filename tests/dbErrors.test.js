import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMissingTable, isMissingColumn } from '../src/lib/dbErrors.js';

test('herkent een ontbrekende tabel aan code of melding', () => {
  assert.equal(isMissingTable({ code: 'PGRST205', message: 'x' }, 'exercise_feedback'), true);
  assert.equal(isMissingTable({ message: "Could not find the table 'public.exercise_feedback' in the schema cache" }, 'exercise_feedback'), true);
});

test('andere fouten zijn geen ontbrekende tabel', () => {
  assert.equal(isMissingTable(null), false);
  assert.equal(isMissingTable({ code: '42501', message: 'permission denied' }), false);
  assert.equal(isMissingTable({ message: "Could not find the table 'public.sessions' in the schema cache" }, 'exercise_feedback'), false);
});

test('herkent een ontbrekende kolom', () => {
  assert.equal(isMissingColumn({ code: 'PGRST204', message: "Could not find the 'cycle' column of 'sessions' in the schema cache" }, 'cycle'), true);
  assert.equal(isMissingColumn({ message: "Could not find the 'notes' column" }, 'cycle'), false);
  assert.equal(isMissingColumn(null), false);
});
