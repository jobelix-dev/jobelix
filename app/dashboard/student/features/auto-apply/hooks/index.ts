/**
 * Auto Apply feature hooks
 */

export { useBot, EMPTY_STATS } from './useBot';
export type { BotState, LaunchProgress, SessionStats, HistoricalTotals, UseBotReturn } from './useBot';

export { useCredits } from './useCredits';

export { useReferral } from './useReferral';
export type { UseReferralReturn, ReferralStats, ReferralItem } from './useReferral';

export { useReferralStatus } from './useReferralStatus';
export type { UseReferralStatusReturn, ReferralStatus } from './useReferralStatus';

export { useLeaderboard } from './useLeaderboard';
export type { UseLeaderboardReturn, LeaderboardEntry, UserRank } from './useLeaderboard';
