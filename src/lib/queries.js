/**
 * De datalaag van de app. Schermen importeren alleen hieruit en weten niet of
 * ze met Supabase of met de demo praten: dat bepaalt de ingelogde gebruiker.
 */
import { supabaseSource } from './sources/supabase.js';
import { createDemoSource } from './sources/demo.js';
import { todayISO } from './schedule.js';

let active = supabaseSource;
let mode = 'supabase';
let demo = null;

/** 'supabase' voor de eigenaar, 'demo' voor iedereen anders. */
export function setDataSource(next) {
  if (next === 'demo') {
    // In de browser: aanpassingen bewaren tot de browser sluit, en de structuur op slot.
    demo ??= createDemoSource({
      today: todayISO(),
      storage: globalThis.sessionStorage ?? null,
      lockStructure: true,
    });
    active = demo;
  } else {
    active = supabaseSource;
  }
  mode = next === 'demo' ? 'demo' : 'supabase';
}

export function dataMode() {
  return mode;
}

/** Alleen voor tests: begin weer met een verse demo. */
export function resetDemo() {
  demo = null;
  if (mode === 'demo') setDataSource('demo');
}

export const fetchTemplates = (...args) => active.fetchTemplates(...args);
export const fetchSessions = (...args) => active.fetchSessions(...args);
export const fetchTemplateExercises = (...args) => active.fetchTemplateExercises(...args);
export const ensureUpcomingSessions = (...args) => active.ensureUpcomingSessions(...args);
export const fetchLogsForExercises = (...args) => active.fetchLogsForExercises(...args);
export const saveSet = (...args) => active.saveSet(...args);
export const deleteSet = (...args) => active.deleteSet(...args);
export const setExerciseSkipped = (...args) => active.setExerciseSkipped(...args);
export const closeSession = (...args) => active.closeSession(...args);
export const reopenSession = (...args) => active.reopenSession(...args);
export const saveSessionNote = (...args) => active.saveSessionNote(...args);
export const fetchExercise = (...args) => active.fetchExercise(...args);
export const fetchExerciseTemplates = (...args) => active.fetchExerciseTemplates(...args);
export const fetchAllTemplateExercises = (...args) => active.fetchAllTemplateExercises(...args);
export const fetchAllExercises = (...args) => active.fetchAllExercises(...args);
export const fetchAllLogs = (...args) => active.fetchAllLogs(...args);
export const createExercise = (...args) => active.createExercise(...args);
export const addTemplateExercise = (...args) => active.addTemplateExercise(...args);
export const updateTemplateExercise = (...args) => active.updateTemplateExercise(...args);
export const deleteTemplateExercise = (...args) => active.deleteTemplateExercise(...args);
export const updateTemplateExercisePositions = (...args) => active.updateTemplateExercisePositions(...args);
export const createTemplate = (...args) => active.createTemplate(...args);
export const renameTemplate = (...args) => active.renameTemplate(...args);
export const archiveTemplate = (...args) => active.archiveTemplate(...args);
export const fetchFeedbackForExercises = (...args) => active.fetchFeedbackForExercises(...args);
export const saveFeedback = (...args) => active.saveFeedback(...args);
export const updateExercise = (...args) => active.updateExercise(...args);
