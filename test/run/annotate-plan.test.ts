import { describe, expect, test } from 'vitest';
import type { Annotation } from '../../src/parse/types.js';
import { DEFAULT_ANNOTATION_COLOUR, DEFAULT_ARROW_SIDE, planAnnotations } from '../../src/run/annotate.js';

const t = { kind: 'css', selector: '#x' } as const;
const a = (kind: Annotation['kind'], more: Partial<Annotation> = {}): Annotation => ({ kind, target: t, ...more });

describe('planAnnotations', () => {
  test('badges are numbered from 1 in listed order, whatever else is listed', () => {
    const plan = planAnnotations([a('highlight'), a('badge'), a('arrow'), a('badge'), a('highlight'), a('badge')]);
    expect(plan.map((p) => p.number)).toEqual([undefined, 1, undefined, 2, undefined, 3]);
  });

  test('no badge, no numbers', () => {
    expect(planAnnotations([a('highlight'), a('arrow')]).every((p) => p.number === undefined)).toBe(true);
  });

  test('colour and side default, and keep the kind', () => {
    const [p] = planAnnotations([a('arrow')]);
    expect(p).toEqual({ kind: 'arrow', color: DEFAULT_ANNOTATION_COLOUR, from: DEFAULT_ARROW_SIDE });
    expect(DEFAULT_ANNOTATION_COLOUR).toBe('#ff31a0');
    expect(DEFAULT_ARROW_SIDE).toBe('left');
  });

  test('colour and side overrides are used', () => {
    const [p, q] = planAnnotations([a('arrow', { color: '#0a0', from: 'bottom' }), a('badge', { color: 'red' })]);
    expect(p).toMatchObject({ color: '#0a0', from: 'bottom' });
    expect(q).toMatchObject({ color: 'red', number: 1 });
  });

  test('an empty list plans nothing', () => {
    expect(planAnnotations([])).toEqual([]);
  });
});
