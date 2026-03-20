import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  normalizeWhitespace,
  sanitizeText,
  stripHtml,
} from '../sanitize';

describe('escapeHtml()', () => {
  it('escapes & < > " \' /', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;',
    );
  });

  it('passes through safe strings unchanged', () => {
    expect(escapeHtml('Hello, World!')).toBe('Hello, World!');
  });
});

describe('stripHtml()', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe(
      'Hello world',
    );
  });

  it('passes through plain text', () => {
    expect(stripHtml('plain text')).toBe('plain text');
  });
});

describe('normalizeWhitespace()', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeWhitespace('  hello  ')).toBe('hello');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeWhitespace('hello   world')).toBe('hello world');
  });
});

describe('sanitizeText()', () => {
  it('strips HTML and normalizes whitespace', () => {
    expect(sanitizeText('  <b>Hello</b>  world  ')).toBe('Hello world');
  });
});
