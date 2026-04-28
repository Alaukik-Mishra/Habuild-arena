'use client';

import { calculatePollPercentages } from '../../lib/postUtils';

interface PollOptionsProps {
  options: string[];
  voteCounts: number[];
  userVotedIndex?: number;
  onVote: (index: number) => void;
  disabled: boolean;
}

export default function PollOptions({
  options,
  voteCounts,
  userVotedIndex,
  onVote,
  disabled,
}: PollOptionsProps) {
  const percentages = calculatePollPercentages(voteCounts);
  const totalVotes = voteCounts.reduce((sum, c) => sum + c, 0);
  const hasVoted = userVotedIndex !== undefined;

  if (!hasVoted && !disabled) {
    // Voting mode: tappable 3D tactile buttons
    return (
      <div className="space-y-2">
        {options.map((option, i) => (
          <button
            key={i}
            onClick={() => onVote(i)}
            className="w-full text-left px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-900 shadow-[0_4px_0_#d1d5db] active:shadow-none active:translate-y-1 transition-all"
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

  // Results mode: percentage bars
  return (
    <div className="space-y-2">
      {options.map((option, i) => {
        const isChosen = userVotedIndex === i;
        const pct = percentages[i];
        return (
          <div
            key={i}
            className={`relative overflow-hidden rounded-xl border-2 px-4 py-3 ${
              isChosen
                ? 'bg-blue-50 border-blue-400'
                : 'bg-white border-gray-100'
            }`}
          >
            {/* Progress bar fill */}
            <div
              className={`absolute inset-y-0 left-0 rounded-xl transition-all duration-500 ${
                isChosen ? 'bg-blue-100' : 'bg-gray-100'
              }`}
              style={{ width: `${pct}%` }}
            />
            {/* Content */}
            <div className="relative flex items-center justify-between">
              <span className={`text-sm font-bold ${isChosen ? 'text-blue-700' : 'text-gray-900'}`}>
                {option}
              </span>
              <div className="flex items-center space-x-2 ml-3 shrink-0">
                <span className={`text-xs font-bold ${isChosen ? 'text-blue-700' : 'text-gray-500'}`}>
                  {pct}%
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  ({voteCounts[i]} {voteCounts[i] === 1 ? 'vote' : 'votes'})
                </span>
              </div>
            </div>
          </div>
        );
      })}
      <p className="text-[10px] text-gray-400 text-right font-medium pt-1">
        {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} total
      </p>
    </div>
  );
}
