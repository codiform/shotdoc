import { describe, expect, test } from 'vitest';
import { readFrontMatter, stripShotdocKey } from '../../src/parse/frontmatter.js';

const read = (src: string) => readFrontMatter(src, 'a.md');
const msgs = (src: string) => read(src).errors.map((e) => e.message);
const front = (body: string) => `---\n${body}\n---\n\n# Title\n`;

describe('finding front matter', () => {
  test('a document without front matter has no defaults', () => {
    expect(read('# Title\n')).toEqual({ defaults: { hide: [], mask: [] }, errors: [] });
  });

  test('front matter without a shotdoc key has no defaults and other keys play no part', () => {
    expect(read(front('title: Guide\nlayout: post')).errors).toEqual([]);
    expect(read(front('title: Guide')).defaults).toEqual({ hide: [], mask: [] });
  });

  test('an empty front matter block is fine', () => {
    expect(read('---\n---\ntext\n')).toEqual({ defaults: { hide: [], mask: [] }, errors: [] });
  });

  test('a `---` after the first line is not front matter', () => {
    expect(read('# Title\n\n---\nshotdoc: {defalts: {}}\n---\n')).toEqual({
      defaults: { hide: [], mask: [] },
      errors: [],
    });
  });

  test('an unclosed block is not front matter', () => {
    expect(read('---\nshotdoc: {defalts: {}}\n\ntext\n').errors).toEqual([]);
  });

  test('a block closed with `...` is front matter', () => {
    expect(read('---\nshotdoc: {defaults: {hide: [a]}}\n...\n').defaults.hide).toHaveLength(1);
  });

  test('CRLF line endings and a leading BOM are tolerated', () => {
    const src = '﻿---\r\nshotdoc:\r\n  defaults: {hide: [a]}\r\n---\r\ntext\r\n';
    expect(read(src)).toMatchObject({ defaults: { hide: [{ kind: 'css', selector: 'a' }] }, errors: [] });
  });

  test('front matter that is not a mapping is ignored', () => {
    expect(read('---\nSome words\n---\n').errors).toEqual([]);
  });

  test('invalid YAML names the file and says the front matter is invalid', () => {
    expect(msgs(front('shotdoc: ['))[0]).toMatch(/^a\.md: the front matter is not valid YAML/);
  });
});

describe('shotdoc key', () => {
  test('must be a mapping', () => {
    expect(msgs(front('shotdoc: yes'))).toEqual(['a.md: the front matter `shotdoc` must be a mapping']);
  });

  test('an unknown key names it and lists the known ones', () => {
    expect(msgs(front('shotdoc: {defalts: {}}'))).toEqual([
      'a.md: the front matter `shotdoc` has unknown key `defalts` (allowed: defaults)',
    ]);
  });

  test('defaults must be a mapping', () => {
    expect(msgs(front('shotdoc: {defaults: [a]}'))).toEqual(['a.md: `shotdoc.defaults` must be a mapping']);
  });

  test('an unknown key under defaults lists the known ones', () => {
    expect(msgs(front('shotdoc: {defaults: {padding: 8}}'))).toEqual([
      'a.md: `shotdoc.defaults` has unknown key `padding` (allowed: hide, mask, maskColor)',
    ]);
  });

  test('annotate is refused with the reason', () => {
    expect(msgs(front('shotdoc: {defaults: {annotate: [{highlight: a}]}}'))).toEqual([
      'a.md: `shotdoc.defaults` does not take `annotate`: annotations are set on each screenshot',
    ]);
  });
});

describe('defaults', () => {
  test('hide and mask take every form of target and keep their order', () => {
    const { defaults, errors } = read(
      front(
        [
          'shotdoc:',
          '  defaults:',
          '    hide: ["#a", {role: button, name: Save}, {text: Demo}, {label: Email}]',
          '    mask: [".date"]',
          '    maskColor: "#333"',
        ].join('\n'),
      ),
    );
    expect(errors).toEqual([]);
    expect(defaults).toEqual({
      hide: [
        { kind: 'css', selector: '#a' },
        { kind: 'role', role: 'button', name: 'Save' },
        { kind: 'text', text: 'Demo' },
        { kind: 'label', label: 'Email' },
      ],
      mask: [{ kind: 'css', selector: '.date' }],
      maskColor: '#333',
    });
  });

  test('a list is required', () => {
    expect(msgs(front('shotdoc: {defaults: {hide: "#a"}}'))).toEqual([
      'a.md: `shotdoc.defaults.hide` must be a list of targets',
    ]);
    expect(msgs(front('shotdoc: {defaults: {mask: {text: x}}}'))).toEqual([
      'a.md: `shotdoc.defaults.mask` must be a list of targets',
    ]);
  });

  test('a bad item is named by key and position', () => {
    expect(msgs(front('shotdoc: {defaults: {hide: [a, {color: red}]}}'))[0]).toMatch(
      /^a\.md: shotdoc\.defaults\.hide\[2\] mapping needs exactly one of/,
    );
  });

  test('maskColor must be a non-empty string', () => {
    for (const v of ['""', '5', '[x]']) {
      expect(msgs(front(`shotdoc: {defaults: {maskColor: ${v}}}`))).toEqual([
        'a.md: `shotdoc.defaults.maskColor` must be a non-empty string',
      ]);
    }
  });

  test('every problem is reported together', () => {
    expect(msgs(front('shotdoc: {defaults: {hide: x, mask: y, maskColor: ""}}'))).toHaveLength(3);
  });
});

describe('stripping the shotdoc key', () => {
  const strip = stripShotdocKey;
  const odd = 'title:   \'Guide\'   # note\ntags: [a,   b]\nauthor: "Me"';

  test('when shotdoc is the only key the whole block and one blank line go', () => {
    expect(strip('---\nshotdoc:\n  defaults:\n    hide: [{text: Demo}]\n---\n\n# Title\n')).toBe('# Title\n');
    expect(strip('---\nshotdoc: {defaults: {hide: [a]}}\n---\n# Title\n')).toBe('# Title\n');
  });

  test('other keys stay byte for byte, whatever their layout', () => {
    const block = 'shotdoc:\n  defaults:\n    hide: [a]\n';
    const lines = odd.split('\n');
    const first = lines[0];
    const rest = lines.slice(1).join('\n');
    expect(strip(`---\n${block}${odd}\n---\n\n# T\n`)).toBe(`---\n${odd}\n---\n\n# T\n`);
    expect(strip(`---\n${first}\n${block}${rest}\n---\n# T\n`)).toBe(`---\n${odd}\n---\n# T\n`);
    expect(strip(`---\n${odd}\n${block.trimEnd()}\n---\n# T\n`)).toBe(`---\n${odd}\n---\n# T\n`);
  });

  test('a one-line flow form with a trailing comment goes with its comment', () => {
    expect(strip('---\ntitle: A\nshotdoc: {defaults: {hide: [a]}} # build\nlayout: x\n---\ntext\n')).toBe(
      '---\ntitle: A\nlayout: x\n---\ntext\n',
    );
    expect(strip('---\ntitle: A\nshotdoc: {defaults: {}} # build\n---\ntext\n')).toBe('---\ntitle: A\n---\ntext\n');
  });

  test('text without a shotdoc key or front matter is unchanged', () => {
    for (const text of ['# T\n', '---\ntitle: A\n---\n# T\n', '---\n- a\n- b\n---\n# T\n', '---\nx: [\n---\n# T\n']) {
      expect(strip(text)).toBe(text);
    }
  });

  test('CRLF line endings and a BOM are handled', () => {
    expect(strip('---\r\ntitle: A\r\nshotdoc:\r\n  defaults: {}\r\n---\r\ntext\r\n')).toBe(
      '---\r\ntitle: A\r\n---\r\ntext\r\n',
    );
    expect(strip('---\r\nshotdoc: {}\r\n---\r\n\r\ntext\r\n')).toBe('text\r\n');
    expect(strip('﻿---\ntitle: A\nshotdoc: {}\n---\ntext\n')).toBe('﻿---\ntitle: A\n---\ntext\n');
    expect(strip('﻿---\nshotdoc: {}\n---\ntext\n')).toBe('﻿text\n');
  });

  test('a closing `...` works', () => {
    expect(strip('---\ntitle: A\nshotdoc: {}\n...\ntext\n')).toBe('---\ntitle: A\n...\ntext\n');
  });
});
