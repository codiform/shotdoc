import { describe, expect, test } from 'vitest';
import type { StepContext } from '../../src/parse/steps.js';
import { parseSteps } from '../../src/parse/steps.js';

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
    expect(msgs('- goto: /\n- swipe: a\n')[0]).toMatch(/^a\.md:10 \(step 2\): unsupported step `swipe`/);
  });

  test('reports every bad step', () => {
    expect(msgs('- swipe: a\n- jump: b\n')).toHaveLength(2);
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

describe('target error wording', () => {
  test('a target that is neither a string nor a mapping says "selector string"', () => {
    const m = msgs('- click: 42\n');
    expect(m[0]).toMatch(/must be a selector string or a mapping with role, text, or label/);
    expect(m[0]).not.toMatch(/CSS/);
  });
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

describe('press', () => {
  test.each([
    ['Enter', { key: 'Enter' }],
    ['Control+A', { key: 'Control+A' }],
    ['Shift+Tab', { key: 'Shift+Tab' }],
    ['"+"', { key: '+' }],
    ['Control++', { key: 'Control++' }],
    ['a', { key: 'a' }],
    ['{key: Escape}', { key: 'Escape' }],
    ['{key: Enter, target: "#new"}', { key: 'Enter', target: { kind: 'css', selector: '#new' } }],
    [
      '{key: Tab, target: {role: textbox, name: Name}}',
      { key: 'Tab', target: { kind: 'role', role: 'textbox', name: 'Name' } },
    ],
  ])('valid %s', (v, expected) => {
    const { steps, errors } = run(`- press: ${v}\n`);
    expect(errors).toEqual([]);
    expect(steps[0]).toMatchObject({ kind: 'press', ...expected });
  });

  test('a bare key has no target', () => {
    expect((run('- press: Enter\n').steps[0] as { target?: unknown }).target).toBeUndefined();
  });

  test.each([
    ['{}', /requires a `key`/],
    ['{target: "#a"}', /requires a `key`/],
    ['{key: Enter, extra: 1}', /unknown key `extra`/],
    ['{key: Enter, target: {}}', /exactly one of/],
    ['1', /not text: put it in quotes, for example press: "1"/],
    ['true', /not text/],
    ['""', /needs a key/],
    ['', /needs a key/],
    ['"two words"', /not valid/],
    ['"Control+"', /not valid/],
    ['[Enter]', /needs a key/],
  ])('invalid %s', (v, message) => {
    const m = msgs(`- goto: /\n- press: ${v}\n`);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatch(/^a\.md:10 \(step 2\): /);
    expect(m[0]).toMatch(message);
  });
});

describe.each(['dblclick', 'hover'] as const)('%s', (kind) => {
  test.each([
    ['"#row"', { kind: 'css', selector: '#row' }],
    ['{role: listitem, name: Ship it}', { kind: 'role', role: 'listitem', name: 'Ship it' }],
    ['{text: Write the docs}', { kind: 'text', text: 'Write the docs' }],
    ['{label: Email}', { kind: 'label', label: 'Email' }],
  ])('valid target %s', (t, expected) => {
    const { steps, errors } = run(`- ${kind}: ${t}\n`);
    expect(errors).toEqual([]);
    expect(steps[0]).toMatchObject({ kind, target: expected });
  });

  test.each(['{}', '{name: x}', '{role: a, text: b}', '42', '""'])('invalid target %s names the step', (t) => {
    const m = msgs(`- goto: /\n- ${kind}: ${t}\n`);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatch(/^a\.md:10 \(step 2\): /);
  });
});

test('hover, unhover, dblclick and press are accepted together in one block', () => {
  const { steps, errors } = run('- goto: /\n- hover: "#a"\n- unhover:\n- dblclick: "#b"\n- press: Enter\n');
  expect(errors).toEqual([]);
  expect(steps.map((s) => s.kind)).toEqual(['goto', 'hover', 'unhover', 'dblclick', 'press']);
});

describe('unhover', () => {
  test('a bare unhover is accepted', () => {
    const { steps, errors } = run('- goto: /\n- unhover:\n');
    expect(errors).toEqual([]);
    expect(steps[1]).toMatchObject({ kind: 'unhover', n: 2 });
  });

  test.each(['body', '{x: 0}', '""', '0', 'true'])('a value %s fails naming the step', (v) => {
    const m = msgs(`- goto: /\n- unhover: ${v}\n`);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatch(/^a\.md:10 \(step 2\): unhover takes no value/);
  });

  test('is listed among the supported steps in the unsupported-step message', () => {
    expect(msgs('- swipe: a\n')[0]).toMatch(/supported: .*hover, unhover, fill/);
  });
});
