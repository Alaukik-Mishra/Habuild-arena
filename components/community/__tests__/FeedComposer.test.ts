import { describe, it, expect } from 'vitest';
import { validatePost } from '../../../lib/postUtils';

// Tests for FeedComposer validation logic (Requirements 2.2, 2.3, 2.4, 2.5, 2.6)

describe('FeedComposer validation – question', () => {
  it('returns invalid for empty question', () => {
    const result = validatePost('question', { text: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid for whitespace-only question', () => {
    const result = validatePost('question', { text: '   ' });
    expect(result.valid).toBe(false);
  });

  it('returns invalid for question exceeding 500 chars', () => {
    const result = validatePost('question', { text: 'a'.repeat(501) });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns valid for a normal question', () => {
    const result = validatePost('question', { text: 'What is your favourite workout?' });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns valid for question exactly 500 chars', () => {
    const result = validatePost('question', { text: 'a'.repeat(500) });
    expect(result.valid).toBe(true);
  });
});

describe('FeedComposer validation – poll', () => {
  it('returns invalid for poll with only 1 option', () => {
    const result = validatePost('poll', {
      pollQuestion: 'Best gym day?',
      pollOptions: ['Monday'],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid for poll with empty option', () => {
    const result = validatePost('poll', {
      pollQuestion: 'Best gym day?',
      pollOptions: ['Monday', ''],
    });
    expect(result.valid).toBe(false);
  });

  it('returns valid for poll with 2 filled options', () => {
    const result = validatePost('poll', {
      pollQuestion: 'Best gym day?',
      pollOptions: ['Monday', 'Friday'],
    });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('FeedComposer validation – meme', () => {
  it('returns invalid for meme with no URL', () => {
    const result = validatePost('meme', { imageUrl: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns invalid for meme caption exceeding 280 chars', () => {
    const result = validatePost('meme', {
      imageUrl: 'https://example.com/img.jpg',
      text: 'a'.repeat(281),
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns valid for meme with URL and no caption', () => {
    const result = validatePost('meme', { imageUrl: 'https://example.com/img.jpg' });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns valid for meme with URL and caption within limit', () => {
    const result = validatePost('meme', {
      imageUrl: 'https://example.com/img.jpg',
      text: 'When leg day hits different',
    });
    expect(result.valid).toBe(true);
  });

  it('returns valid for meme caption exactly 280 chars', () => {
    const result = validatePost('meme', {
      imageUrl: 'https://example.com/img.jpg',
      text: 'a'.repeat(280),
    });
    expect(result.valid).toBe(true);
  });
});
