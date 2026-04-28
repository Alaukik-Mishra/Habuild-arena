import { describe, it, expect } from 'vitest';
import { validatePost } from '../../lib/postUtils';

// ─── Question posts ───────────────────────────────────────────────────────────

describe('validatePost – question', () => {
  it('returns invalid when text is empty string', () => {
    const result = validatePost('question', { text: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid when text is whitespace only', () => {
    const result = validatePost('question', { text: '   ' });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid when text is missing', () => {
    const result = validatePost('question', {});
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid when text exceeds 500 characters', () => {
    const result = validatePost('question', { text: 'a'.repeat(501) });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid at exactly 501 characters', () => {
    const result = validatePost('question', { text: 'x'.repeat(501) });
    expect(result.valid).toBe(false);
  });

  it('returns valid for a normal question', () => {
    const result = validatePost('question', { text: 'What is your favourite workout?' });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns valid at exactly 500 characters', () => {
    const result = validatePost('question', { text: 'a'.repeat(500) });
    expect(result.valid).toBe(true);
  });

  it('returns valid at exactly 1 character', () => {
    const result = validatePost('question', { text: 'a' });
    expect(result.valid).toBe(true);
  });
});

// ─── Poll posts ───────────────────────────────────────────────────────────────

describe('validatePost – poll', () => {
  it('returns invalid when pollOptions is empty array (0 options)', () => {
    const result = validatePost('poll', { pollQuestion: 'Best exercise?', pollOptions: [] });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid when pollOptions has 1 option', () => {
    const result = validatePost('poll', { pollQuestion: 'Best exercise?', pollOptions: ['Running'] });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid when pollOptions has 5 options', () => {
    const result = validatePost('poll', {
      pollQuestion: 'Best exercise?',
      pollOptions: ['A', 'B', 'C', 'D', 'E'],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid when pollOptions is missing', () => {
    const result = validatePost('poll', { pollQuestion: 'Best exercise?' });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid when pollQuestion is empty', () => {
    const result = validatePost('poll', { pollQuestion: '', pollOptions: ['A', 'B'] });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid when pollQuestion is missing', () => {
    const result = validatePost('poll', { pollOptions: ['A', 'B'] });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid when any option is an empty string', () => {
    const result = validatePost('poll', { pollQuestion: 'Best?', pollOptions: ['A', ''] });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid when any option is whitespace only', () => {
    const result = validatePost('poll', { pollQuestion: 'Best?', pollOptions: ['A', '   '] });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns valid with exactly 2 options', () => {
    const result = validatePost('poll', { pollQuestion: 'Best exercise?', pollOptions: ['Running', 'Cycling'] });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns valid with exactly 3 options', () => {
    const result = validatePost('poll', {
      pollQuestion: 'Best exercise?',
      pollOptions: ['Running', 'Cycling', 'Swimming'],
    });
    expect(result.valid).toBe(true);
  });

  it('returns valid with exactly 4 options', () => {
    const result = validatePost('poll', {
      pollQuestion: 'Best exercise?',
      pollOptions: ['Running', 'Cycling', 'Swimming', 'Lifting'],
    });
    expect(result.valid).toBe(true);
  });
});

// ─── Meme posts ───────────────────────────────────────────────────────────────

describe('validatePost – meme', () => {
  it('returns invalid when imageUrl is missing', () => {
    const result = validatePost('meme', { text: 'funny caption' });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid when imageUrl is empty string', () => {
    const result = validatePost('meme', { imageUrl: '', text: 'caption' });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid when imageUrl is whitespace only', () => {
    const result = validatePost('meme', { imageUrl: '   ' });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid when caption exceeds 280 characters', () => {
    const result = validatePost('meme', {
      imageUrl: 'https://example.com/img.jpg',
      text: 'a'.repeat(281),
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid at exactly 281 characters caption', () => {
    const result = validatePost('meme', {
      imageUrl: 'https://example.com/img.jpg',
      text: 'x'.repeat(281),
    });
    expect(result.valid).toBe(false);
  });

  it('returns valid with imageUrl and no caption', () => {
    const result = validatePost('meme', { imageUrl: 'https://example.com/img.jpg' });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns valid with imageUrl and a short caption', () => {
    const result = validatePost('meme', {
      imageUrl: 'https://example.com/img.jpg',
      text: 'When leg day hits',
    });
    expect(result.valid).toBe(true);
  });

  it('returns valid with caption at exactly 280 characters', () => {
    const result = validatePost('meme', {
      imageUrl: 'https://example.com/img.jpg',
      text: 'a'.repeat(280),
    });
    expect(result.valid).toBe(true);
  });
});
