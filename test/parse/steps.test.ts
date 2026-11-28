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

describe('screenshot trim', () => {
  test('pixels and percentages, with an unquoted % in a flow mapping', () => {
    const { steps, errors } = run('- screenshot: {name: a, target: x, trim: {right: 60%, top: 40, left: "12.5%"}}\n');
    expect(errors).toEqual([]);
    expect(steps[0]).toHaveProperty('trim', { top: { px: 40 }, right: { percent: 60 }, left: { percent: 12.5 } });
  });

  test.each(['400', '{}', '{width: 400}', '[1]'])('%s is rejected and the sides are listed', (trim) => {
    const m = msgs(`- screenshot: {name: a, target: x, trim: ${trim}}\n`);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatch(/top, right, bottom, left/);
  });

  test.each(['-5', '"40px"', '"100%"', '"-10%"', '"40"', '.inf'])(
    'amount %s is rejected, naming the side and the forms',
    (amount) => {
      const m = msgs(`- screenshot: {name: a, target: x, trim: {right: ${amount}}}\n`);
      expect(m).toHaveLength(1);
      expect(m[0]).toMatch(/`trim\.right` must be CSS pixels .* percentage below 100/);
    },
  );

  test('requires a target', () => {
    expect(msgs('- screenshot: {name: a, trim: {right: 1}}\n')[0]).toMatch(/`trim` requires a `target`/);
  });
});

describe('screenshot hide, mask and maskColor', () => {
  test('a screenshot without them has empty lists and no colour', () => {
    const { steps, errors } = run('- screenshot: {name: a}\n');
    expect(errors).toEqual([]);
    expect(steps[0]).toMatchObject({ hide: [], mask: [] });
    expect(steps[0]).not.toHaveProperty('maskColor');
  });

  test('every target form is accepted in both lists, with a colour', () => {
    const { steps, errors } = run(
      '- screenshot:\n    name: a\n    hide: ["#date", {text: Today}]\n    mask: [{role: img, name: Avatar}, {label: Email}]\n    maskColor: "#333"\n',
    );
    expect(errors).toEqual([]);
    expect(steps[0]).toMatchObject({
      hide: [
        { kind: 'css', selector: '#date' },
        { kind: 'text', text: 'Today' },
      ],
      mask: [
        { kind: 'role', role: 'img', name: 'Avatar' },
        { kind: 'label', label: 'Email' },
      ],
      maskColor: '#333',
    });
  });

  test('they work without a target (viewport capture)', () => {
    expect(run('- screenshot: {name: a, mask: ["#x"]}\n').errors).toEqual([]);
  });

  test.each(['hide', 'mask'])('%s that is not a list says it must be a list of targets', (key) => {
    for (const v of ['"#avatar"', '{text: Today}']) {
      const m = msgs(`- screenshot: {name: a, ${key}: ${v}}\n`);
      expect(m).toHaveLength(1);
      expect(m[0]).toMatch(new RegExp(`\`${key}\` must be a list of targets`));
    }
  });

  test.each(['hide', 'mask'])('a bad item in %s names the key and its position', (key) => {
    const m = msgs(`- screenshot: {name: a, ${key}: ["#ok", {name: x}]}\n`);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatch(new RegExp(`${key}\\[2\\]`));
  });

  test.each(['""', '"  "', '5', '{x: 1}', '[red]'])('maskColor %s is rejected', (v) => {
    const m = msgs(`- screenshot: {name: a, maskColor: ${v}}\n`);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatch(/\(step 1\): .*`maskColor` must be a non-empty string/);
  });

  test('the unknown-key message lists the new keys', () => {
    expect(msgs('- screenshot: {name: a, color: red}\n')[0]).toMatch(/allowed: .*hide, mask, maskColor/);
  });
});

describe('screenshot annotate', () => {
  const shot = (annotate: string, extra = 'target: "#t"') =>
    `- screenshot:\n    name: a\n    ${extra}\n    annotate:\n${annotate
      .split('\n')
      .map((l) => `      ${l}`)
      .join('\n')}\n`;

  test('a screenshot without annotate has an empty list', () => {
    const { steps, errors } = run('- screenshot: {name: a}\n');
    expect(errors).toEqual([]);
    expect(steps[0]).toMatchObject({ annotate: [] });
  });

  test('each kind takes a bare target in every form', () => {
    const { steps, errors } = run(
      shot(
        '- highlight: "#save"\n- arrow: {role: button, name: Export}\n- badge: {text: Delete}\n- highlight: {label: Email}',
      ),
    );
    expect(errors).toEqual([]);
    expect(steps[0]).toMatchObject({
      annotate: [
        { kind: 'highlight', target: { kind: 'css', selector: '#save' } },
        { kind: 'arrow', target: { kind: 'role', role: 'button', name: 'Export' } },
        { kind: 'badge', target: { kind: 'text', text: 'Delete' } },
        { kind: 'highlight', target: { kind: 'label', label: 'Email' } },
      ],
    });
    const list = (steps[0] as unknown as { annotate: object[] }).annotate;
    for (const a of list) {
      expect(a).not.toHaveProperty('color');
      expect(a).not.toHaveProperty('from');
    }
  });

  test('the target and options form', () => {
    const { steps, errors } = run(
      shot(
        '- badge: {target: {text: Delete}, color: "#0a0"}\n- arrow: {target: "#export", from: right, color: red}\n- highlight: {target: "#x"}',
      ),
    );
    expect(errors).toEqual([]);
    expect(steps[0]).toMatchObject({
      annotate: [
        { kind: 'badge', target: { kind: 'text', text: 'Delete' }, color: '#0a0' },
        { kind: 'arrow', target: { kind: 'css', selector: '#export' }, from: 'right', color: 'red' },
        { kind: 'highlight', target: { kind: 'css', selector: '#x' } },
      ],
    });
  });

  test.each(['left', 'right', 'top', 'bottom'])('an arrow accepts from: %s', (side) => {
    const { steps, errors } = run(shot(`- arrow: {target: "#x", from: ${side}}`));
    expect(errors).toEqual([]);
    expect(steps[0]).toMatchObject({ annotate: [{ kind: 'arrow', from: side }] });
  });

  test.each(['"#a"', '{highlight: "#a"}', '5'])('annotate that is not a list (%s) says it must be a list', (v) => {
    const m = msgs(`- screenshot: {name: a, target: "#t", annotate: ${v}}\n`);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatch(/\(step 1\): .*`annotate` must be a list of annotations/);
  });

  test('an item that is not a mapping, or has no key, names its position and the kinds', () => {
    for (const item of ['"#a"', '{}']) {
      const m = msgs(shot(`- ${item}`));
      expect(m).toHaveLength(1);
      expect(m[0]).toMatch(/annotate\[1\]/);
      expect(m[0]).toMatch(/highlight, arrow, badge/);
    }
  });

  test('two keys or an unknown kind name the item and the kinds allowed', () => {
    const two = msgs(shot('- highlight: "#a"\n  badge: "#b"'));
    expect(two[0]).toMatch(/annotate\[1\] needs exactly one key.*highlight, arrow, badge/);
    const unknown = msgs(shot('- highlight: "#a"\n- circle: "#b"'));
    expect(unknown).toHaveLength(1);
    expect(unknown[0]).toMatch(/annotate\[2\] has unknown kind `circle` \(use highlight, arrow, badge\)/);
  });

  test('an invalid target names the item and the kind', () => {
    for (const v of ['""', '{name: x}', '5', '{role: button, text: x}']) {
      const m = msgs(shot(`- arrow: ${v}`));
      expect(m).toHaveLength(1);
      expect(m[0]).toMatch(/annotate\[1\] \(arrow\) target/);
    }
    expect(msgs(shot('- badge: {target: {name: x}}'))[0]).toMatch(/annotate\[1\] \(badge\) target/);
  });

  test('an unknown option names the annotation and what is allowed', () => {
    const m = msgs(shot('- highlight: {target: "#a", width: 3}'));
    expect(m).toHaveLength(1);
    expect(m[0]).toMatch(/annotate\[1\] \(highlight\) has unknown key `width` \(allowed: target, color\)/);
  });

  test.each(['""', '"  "', '5', '[red]'])('color %s is rejected', (v) => {
    const m = msgs(shot(`- badge: {target: "#a", color: ${v}}`));
    expect(m).toHaveLength(1);
    expect(m[0]).toMatch(/annotate\[1\] \(badge\) `color` must be a non-empty string/);
  });

  test('from is only for arrows, and only the four sides', () => {
    for (const kind of ['highlight', 'badge']) {
      const m = msgs(shot(`- ${kind}: {target: "#a", from: left}`));
      expect(m).toHaveLength(1);
      expect(m[0]).toMatch(new RegExp(`annotate\\[1\\] \\(${kind}\\) has unknown key \`from\``));
    }
    for (const v of ['up', '""', '5']) {
      const m = msgs(shot(`- arrow: {target: "#a", from: ${v}}`));
      expect(m).toHaveLength(1);
      expect(m[0]).toMatch(/annotate\[1\] \(arrow\) `from` must be one of left, right, top, bottom/);
    }
  });

  test('annotate needs a target', () => {
    const m = msgs('- screenshot:\n    name: a\n    annotate:\n      - highlight: "#a"\n');
    expect(m).toHaveLength(1);
    expect(m[0]).toMatch(/\(step 1\): .*`annotate` requires a `target`/);
  });

  test('the unknown-key message lists annotate', () => {
    expect(msgs('- screenshot: {name: a, color: red}\n')[0]).toMatch(/allowed: .*maskColor, annotate/);
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

describe('screenshot defaults', () => {
  const docDefaults = { hide: [{ kind: 'css' as const, selector: '#demo' }], mask: [], maskColor: '#333' };
  const withDefaults = { ...ctx, defaults: docDefaults };

  test('a screenshot carries the document defaults, or none when there are none', () => {
    expect(run('- screenshot: {name: a}\n', withDefaults).steps[0]).toMatchObject({ defaults: docDefaults });
    expect(run('- screenshot: {name: a}\n').steps[0]).toMatchObject({ defaults: { hide: [], mask: [] } });
  });

  test('every screenshot in a block carries them', () => {
    const { steps } = run('- screenshot: {name: a}\n- click: b\n- screenshot: {name: c}\n', withDefaults);
    expect(steps.filter((s) => s.kind === 'screenshot')).toHaveLength(2);
    for (const s of steps) {
      if (s.kind === 'screenshot') {
        expect(s.defaults).toEqual(docDefaults);
      }
    }
  });

  test('`defaults: false` carries none and `defaults: true` is the same as leaving it out', () => {
    expect(run('- screenshot: {name: a, defaults: false}\n', withDefaults).steps[0]).toMatchObject({
      defaults: { hide: [], mask: [] },
    });
    expect(run('- screenshot: {name: a, defaults: true}\n', withDefaults).steps[0]).toMatchObject({
      defaults: docDefaults,
    });
  });

  test('anything but a boolean is rejected, naming the step and the key', () => {
    for (const v of ['none', '0', '[a]']) {
      expect(msgs(`- goto: /\n- screenshot: {name: a, defaults: ${v}}\n`)[0]).toMatch(
        /^a\.md:10 \(step 2\): screenshot `defaults` must be true or false/,
      );
    }
  });
});
