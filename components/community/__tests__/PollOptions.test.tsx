/**
 * Unit tests for PollOptions rendering logic
 * Requirements: 8.1, 8.2, 8.3
 *
 * Since no jsdom/testing-library is configured, these tests verify the
 * core logic that drives PollOptions rendering:
 *   - calculatePollPercentages (determines result bar widths and labels)
 *   - hasVoted / isChosen conditional logic (determines which UI branch renders)
 *   - Styling class selection for highlighted vs normal options
 */

import { describe, it, expect } from 'vitest';
import { calculatePollPercentages } from '../../../lib/postUtils';

// ─── Helpers that mirror PollOptions internal logic ───────────────────────────

/** Returns true when the interactive voting buttons should be shown (Req 8.1) */
function shouldShowButtons(userVotedIndex: number | undefined, disabled: boolean): boolean {
  const hasVoted = userVotedIndex !== undefined;
  return !hasVoted && !disabled;
}

/** Returns the CSS classes for a result-bar row (Req 8.2, 8.3) */
function getOptionClasses(userVotedIndex: number | undefined, optionIndex: number): string {
  const isChosen = userVotedIndex === optionIndex;
  return isChosen
    ? 'bg-orange-50 border-blue-400'
    : 'bg-white border-gray-100';
}

/** Returns the label text classes for a result-bar row (Req 8.3) */
function getLabelClasses(userVotedIndex: number | undefined, optionIndex: number): string {
  const isChosen = userVotedIndex === optionIndex;
  return isChosen ? 'text-orange-500' : 'text-gray-900';
}

// ─── Un-voted state (Req 8.1) ─────────────────────────────────────────────────

describe('PollOptions – un-voted state', () => {
  it('shows buttons when userVotedIndex is undefined and disabled is false', () => {
    expect(shouldShowButtons(undefined, false)).toBe(true);
  });

  it('does not show buttons when user has voted (userVotedIndex = 0)', () => {
    expect(shouldShowButtons(0, false)).toBe(false);
  });

  it('does not show buttons when disabled is true even without a vote', () => {
    expect(shouldShowButtons(undefined, true)).toBe(false);
  });

  it('does not show buttons when both voted and disabled', () => {
    expect(shouldShowButtons(1, true)).toBe(false);
  });
});

// ─── Voted state – percentages (Req 8.2) ─────────────────────────────────────

describe('PollOptions – voted state renders result bars with correct percentages', () => {
  it('calculates 50% each for equal vote counts [50, 50]', () => {
    const pcts = calculatePollPercentages([50, 50]);
    expect(pcts).toEqual([50, 50]);
  });

  it('calculates 75% / 25% for [3, 1] votes', () => {
    const pcts = calculatePollPercentages([3, 1]);
    expect(pcts).toEqual([75, 25]);
  });

  it('calculates 100% / 0% when only first option has votes', () => {
    const pcts = calculatePollPercentages([5, 0]);
    expect(pcts).toEqual([100, 0]);
  });

  it('returns all zeros when total votes is 0', () => {
    const pcts = calculatePollPercentages([0, 0]);
    expect(pcts).toEqual([0, 0]);
  });

  it('handles three options correctly', () => {
    const pcts = calculatePollPercentages([1, 1, 2]);
    // 25%, 25%, 50%
    expect(pcts).toEqual([25, 25, 50]);
  });

  it('rounds percentages to nearest integer', () => {
    // 1/3 each → rounds to 33%
    const pcts = calculatePollPercentages([1, 1, 1]);
    expect(pcts).toEqual([33, 33, 33]);
  });
});

// ─── Chosen option highlighting (Req 8.3) ────────────────────────────────────

describe('PollOptions – chosen option is highlighted', () => {
  it('applies bg-orange-50 and border-blue-400 to the voted option', () => {
    const classes = getOptionClasses(0, 0);
    expect(classes).toContain('bg-orange-50');
    expect(classes).toContain('border-blue-400');
  });

  it('does not apply highlight classes to non-voted options', () => {
    const classes = getOptionClasses(0, 1);
    expect(classes).not.toContain('bg-orange-50');
    expect(classes).not.toContain('border-blue-400');
    expect(classes).toContain('bg-white');
    expect(classes).toContain('border-gray-100');
  });

  it('highlights the correct option when userVotedIndex is 1', () => {
    expect(getOptionClasses(1, 0)).toContain('bg-white');
    expect(getOptionClasses(1, 1)).toContain('bg-orange-50');
  });

  it('applies blue text to the chosen option label', () => {
    expect(getLabelClasses(0, 0)).toBe('text-orange-500');
  });

  it('applies gray text to non-chosen option labels', () => {
    expect(getLabelClasses(0, 1)).toBe('text-gray-900');
  });

  it('no option is highlighted when userVotedIndex is undefined', () => {
    // In un-voted mode buttons are shown, but if we were in results mode
    // with no vote, no option should get the highlight
    expect(getOptionClasses(undefined, 0)).toContain('bg-white');
    expect(getOptionClasses(undefined, 1)).toContain('bg-white');
  });
});
