/**
 * Positions of course variations.
 *
 * The course bundle ships move lists only; the positions they pass through are
 * derived here, so the bundle stays small and there is one place that knows how
 * a position is keyed. Keys drop the halfmove and fullmove counters, so a
 * position compares equal however it was reached.
 */
import { Chess } from '../vendor/chess.js';
import { state, variationsFor, courseById } from './data.js';

export const posKey = (fen) => fen.split(' ').slice(0, 4).join(' ');

const positionCache = new Map();   // variationId -> position key before each move
const courseIndex = new Map();     // courseId -> Map(posKey -> [{variationId, ply}])

/** Position keys before each move of a variation, plus the final position. */
export function positionsOf(variation) {
  if (positionCache.has(variation.id)) return positionCache.get(variation.id);
  const chess = new Chess();
  const keys = [];
  for (const san of variation.sans) {
    keys.push(posKey(chess.fen()));
    try {
      chess.move(san);
    } catch {
      break;
    }
  }
  keys.push(posKey(chess.fen()));
  positionCache.set(variation.id, keys);
  return keys;
}

/** Every position in a course, mapped to the variations that reach it. */
export function positionIndex(courseId) {
  if (courseIndex.has(courseId)) return courseIndex.get(courseId);
  const index = new Map();
  for (const variation of variationsFor(courseId)) {
    positionsOf(variation).forEach((key, ply) => {
      if (!index.has(key)) index.set(key, []);
      index.get(key).push({ variationId: variation.id, ply });
    });
  }
  courseIndex.set(courseId, index);
  return index;
}

/** Variations of one course that pass through a position, shallowest first. */
export function variationsThrough(courseId, fen) {
  const hits = positionIndex(courseId).get(posKey(fen)) || [];
  const byId = new Map(variationsFor(courseId).map((v) => [v.id, v]));
  return hits
    .map(({ variationId, ply }) => ({ courseId, variation: byId.get(variationId), ply }))
    .filter((h) => h.variation)
    .sort((a, b) => a.ply - b.ply);
}

/**
 * Variations reaching a position, grouped by course.
 *
 * A game can transpose out of the course it started in, so the search covers
 * every course of the same colour — the same asymmetry the matcher applies.
 * The course the deviation was attributed to comes first.
 */
export function variationsThroughAnywhere(homeCourseId, fen) {
  const home = courseById(homeCourseId);
  if (!home) return [];
  const candidates = state.meta.courses
    .filter((c) => c.color === home.color)
    .sort((a, b) => (a.id === homeCourseId ? -1 : b.id === homeCourseId ? 1 : 0));

  return candidates
    .map((course) => ({ course, hits: variationsThrough(course.id, fen) }))
    .filter((group) => group.hits.length);
}

/** A Chess instance wound forward through `count` moves of a variation. */
export function replay(sans, count) {
  const chess = new Chess();
  for (let i = 0; i < count && i < sans.length; i += 1) {
    try {
      chess.move(sans[i]);
    } catch {
      break;
    }
  }
  return chess;
}
