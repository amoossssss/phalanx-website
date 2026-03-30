export type SquadType = {
  avatarUrl: string;
  name: string;
  squadId: string;
  color: string;
  leader: string;
  memberCount: number;
  tags: string[];
  ROI: number;
  PnL: number;
};

export type MemberType = {
  walletAddress: string;
  role: 'captain' | 'member';
  alias: string | null;
  joinedAt: string;
  /** Set when API provides per-member aggregates; otherwise null */
  pnl: number | null;
  roi: number | null;
};

export default {};
