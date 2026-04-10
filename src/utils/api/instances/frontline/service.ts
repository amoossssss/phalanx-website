import Route from './route';
import { getRequest } from '@/utils/api/axios/axiosMethod';

export type FrontlineListItem = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  reward: unknown;
  status: 'current' | 'ended';
};

export type FrontlineListResponse = {
  items: FrontlineListItem[];
};

export type FrontlineSquadRow = {
  id: string;
  name: string;
  invite_code: string | null;
  color: string;
  created_at: string;
  avatar_url: string | null;
};

export type FrontlineRankingsItem = {
  squad: FrontlineSquadRow;
  avatar_url: string | null;
  member_count: number;
  captain_display: string | null;
  volume: number;
  pnl: number;
  volume_rank: number;
  pnl_rank: number;
};

export type FrontlineMeta = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  reward: unknown;
};

export type FrontlineRankingsResponse = {
  builder_code: string;
  frontline: FrontlineMeta;
  items: FrontlineRankingsItem[];
};

export type FrontlineSquadRankingResponse = {
  builder_code: string;
  frontline: FrontlineMeta;
  squad_id: string;
  volume: number;
  pnl: number;
  volume_rank: number;
  pnl_rank: number;
};

const getList = async (): Promise<FrontlineListResponse> => {
  const res = await getRequest(Route.list);
  return res.data as FrontlineListResponse;
};

const getRankings = async (
  frontlineId: string,
): Promise<FrontlineRankingsResponse> => {
  const res = await getRequest(Route.rankings(frontlineId));
  return res.data as FrontlineRankingsResponse;
};

const getSquadRanking = async (
  frontlineId: string,
  squadId: string,
): Promise<FrontlineSquadRankingResponse> => {
  const res = await getRequest(Route.squadRanking(frontlineId, squadId));
  return res.data as FrontlineSquadRankingResponse;
};

export default {
  getList,
  getRankings,
  getSquadRanking,
};
