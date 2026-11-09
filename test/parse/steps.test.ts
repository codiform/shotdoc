import { describe, expect, test } from 'vitest';
import { parseSteps } from '../../src/parse/steps.js';

import type { StepContext } from '../../src/parse/steps.js';
const ctx: StepContext = { file: 'a.md', blockLine: 10, baseUrl: 'https://example.test' };
const run = (body: string, c = ctx) => parseSteps(body, c);
const msgs = (body: string, c = ctx) => run(body, c).errors.map((e) => e.message);

describe('structure', () => {
  test('valid block', () => {
    const { steps, errors } = run('- goto: /\n- screenshot: {name: home}\n');
    expect(errors).toEqual([]);
    expect(steps.map((s) => s.kind)).toEqual(['goto', 'screenshot']);
    expect(steps.map((s) => s.n)).toEqual([1, 2]);
  });

  test('malformed YAML names file and line', () => {
    expect(msgs('- goto: [\n')[0]).toMatch(/^a\.md:10: invalid YAML/);
  });

  test('non-list body', () => {
    expect(msgs('goto: /\n')[0]).toMatch(/^a\.md:10: .*YAML list/);
    expect(msgs('')[0]).toMatch(/YAML list/);
  });

  test('item with two keys', () => {
    expect(msgs('- goto: /\n  click: a\n')[0]).toMatch(/^a\.md:10 \(step 1\): .*exactly one key/);
  });

  test('unsupported step names its number', () => {
    expect(msgs('- goto: /\n- hover: a\n')[0]).toMatch(/^a\.md:10 \(step 2\): unsupported step `hover`/);
  });

  test('reports every bad step', () => {
    expect(msgs('- hover: a\n- jump: b\n')).toHaveLength(2);
  });
});

describe('targets', () => {
  const click = (t: string) => run(`- click: ${t}\n`);
  test.each([
    ['"#save"', { kind: 'css', selector: '#save' }],
    ['{role: button, name: Save}', { kind: 'role', role: 'button', name: 'Save' }],
    ['{role: button}', { kind: 'role', role: 'button' }],
    ['{text: Hello}', { kind: 'text', text: 'Hello' }],
    ['{label: Email}', { kind: 'label', label: 'Email' }],
  ])('valid target %s', (t, expected) => {
    const { steps, errors } = click(t);
    expect(errors).toEqual([]);
    expect(steps[0]).toMatchObject({ target: expected });
  });

  test.each(['{}', '{name: Save}', '{role: button, text: x}', '{text: x, name: y}', '{foo: bar}', '42', '""'])(
    'invalid target %s',
    (t) => {
      expect(click(t).errors).toHaveLength(1);
    },
  );
});

describe('goto', () => {
  test('relative URL needs a base URL', () => {
    expect(msgs('- goto: /login\n', { file: 'a.md', blockLine: 1 })[0]).toMatch(/base URL/);
  });
  test('absolute URL needs none', () => {
    expect(msgs('- goto: https://x.test/a\n', { file: 'a.md', blockLine: 1 })).toEqual([]);
  });
  test('needs a string', () => {
    expect(msgs('- goto: 5\n')).toHaveLength(1);
  });
});

describe('fill', () => {
  test('valid', () => {
    expect(run('- fill: {target: "#q", value: ada}\n').steps[0]).toMatchObject({ kind: 'fill', value: 'ada' });
  });
  test('requires value and target', () => {
    expect(msgs('- fill: {target: "#q"}\n')[0]).toMatch(/requires a `value`/);
    expect(msgs('- fill: {value: x}\n')[0]).toMatch(/requires a `target`/);
    expect(msgs('- fill: "#q"\n')[0]).toMatch(/mapping/);
  });
});

describe('wait', () => {
  test.each([
    ['{visible: "#a"}', 'visible'],
    ['{hidden: {text: Loading}}', 'hidden'],
    ['{text: "2 items left"}', 'text'],
    ['{network: idle}', 'network'],
    ['250', 'ms'],
  ])('valid %s', (w, kind) => {
    const { steps, errors } = run(`- wait: ${w}\n`);
    expect(errors).toEqual([]);
    expect(steps[0]).toMatchObject({ condition: { kind } });
  });
  test.each(['{}', '{text: a, visible: b}', '{network: busy}', '{soon: x}', '-5', '"x"', '{text: ""}'])(
    'invalid %s',
    (w) => {
      expect(run(`- wait: ${w}\n`).errors).toHaveLength(1);
    },
  );
});

describe('screenshot', () => {
  test('full options', () => {
    const { steps, errors } = run(
      '- screenshot:\n    name: menu\n    target: "#h"\n    include: ["#m", {text: Sort}]\n    padding: 8\n    alt: A menu\n',
    );
    expect(errors).toEqual([]);
    expect(steps[0]).toMatchObject({ name: 'menu', padding: 8, alt: 'A menu' });
    expect((steps[0] as { include: unknown[] }).include).toHaveLength(2);
  });
  test('invalid characters in name state what is allowed', () => {
    expect(msgs('- screenshot: {name: "my shot/1"}\n')[0]).toMatch(/letters, digits, hyphens, and underscores/);
  });
  test('missing name names the step', () => {
    expect(msgs('- goto: /\n- screenshot: {target: a}\n')[0]).toMatch(/\(step 2\): screenshot requires a `name`/);
  });
  test('other invalid cases', () => {
    expect(msgs('- screenshot: {name: a, padding: -1}\n')).toHaveLength(1);
    expect(msgs('- screenshot: {name: a, include: ["#x"]}\n')[0]).toMatch(/requires a `target`/);
    expect(msgs('- screenshot: {name: a, color: red}\n')[0]).toMatch(/unknown key `color`/);
    expect(msgs('- screenshot: {name: a, target: x, include: x}\n')[0]).toMatch(/list of targets/);
    expect(msgs('- screenshot: home\n')).toHaveLength(1);
  });
});
