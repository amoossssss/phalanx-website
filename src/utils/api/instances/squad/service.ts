import Route from './route';
import {
  deleteRequest,
  getRequest,
  patchRequest,
  postRequest,
} from '@/utils/api/axios/axiosMethod';
import { MemberType, SquadType } from '@/utils/constants/Types';

type SquadRowType = {
  id: string;
  name: string;
  invite_code: string;
  color: string;
  created_at: string;
};

type MemberRowType = {
  wallet_address: string;
  role: 'captain' | 'member';
  alias: string | null;
  joined_at: string;
};

type SquadResponseType = {
  squad: SquadRowType;
  avatar_url: string | null;
  member_count: number;
  captain_display?: string | null;
};

type SquadListItemResponse = SquadResponseType & {
  volume: number;
  pnl: number;
};

type SquadListResponseType = {
  items: SquadListItemResponse[];
  page: number;
  page_size: number;
  total: number;
};

type SquadByIdSquadRow = SquadRowType & {
  volume: number;
  pnl: number;
};

type SquadByIdMemberRow = MemberRowType & {
  volume: number;
  pnl: number;
};

type SquadByIdResponseType = {
  squad: SquadByIdSquadRow;
  members: SquadByIdMemberRow[];
  avatar_url: string | null;
};

/** GET /api/squads/:id/heatmap — `heatmap[i]` = wallet addresses that traded on day i (UTC), i=0 today … i=19 */
export type SquadHeatmapResponseType = {
  squad_id: string;
  heatmap: string[][];
};

/** Squad object embedded in leaderboard responses (JSON dates as ISO strings). */
export type SquadLeaderboardSquadRow = {
  id: string;
  name: string;
  invite_code: string | null;
  color: string;
  created_at: string;
  /** Squad avatar from `squad_avatar` (also on parent item as `avatar_url`). */
  avatar_url: string | null;
};

export type SquadLeaderboardItemType = {
  snapshot_at: string;
  builder_code: string;
  squad: SquadLeaderboardSquadRow;
  avatar_url: string | null;
  member_count: number;
  captain_display: string | null;
  volume_1d: number;
  volume_7d: number;
  volume_total: number;
  pnl_1d: number;
  pnl_7d: number;
  pnl_total: number;
  volume_rank: number;
  pnl_rank: number;
};

export type SquadLeaderboardResponseType = {
  builder_code: string;
  items: SquadLeaderboardItemType[];
};

const createSquad = async (payload: FormData) => {
  const res = await postRequest(Route.createSquad, payload);
  return res.data;
};

const getMySquad = async () => {
  const res = await getRequest(Route.getMySquad);
  if (res.data === null) return null;
  const data: SquadResponseType = res.data;

  return {
    avatarUrl: data.avatar_url ?? '',
    name: data.squad.name,
    squadId: data.squad.id,
    color: data.squad.color,
    leader: data.captain_display,
    memberCount: data.member_count,
    tags: [],
    volume: 0,
    pnl: 0,
  } as SquadType;
};

const getSquadByPage = async (page: number) => {
  const res = await getRequest(Route.getSquadByPage(page));
  const data: SquadListResponseType = res.data;

  const squadList = data.items.map((item) => ({
    avatarUrl: item.avatar_url ?? '',
    name: item.squad.name,
    squadId: item.squad.id,
    color: item.squad.color,
    leader: item.captain_display,
    memberCount: item.member_count,
    tags: [],
    volume: Number(item.volume) || 0,
    pnl: Number(item.pnl) || 0,
  })) as SquadType[];

  return {
    total: data.total,
    squadList: squadList,
  };
};

const getSquadById = async (id: string) => {
  const res = await getRequest(Route.getSquadById(id));
  const data: SquadByIdResponseType = res.data;

  let leader = '';
  const leaderRow = data.members.find((item) => item.role === 'captain');
  if (leaderRow) {
    leader = leaderRow.alias ? leaderRow.alias : leaderRow.wallet_address;
  }

  const squad = {
    avatarUrl: data.avatar_url ?? '',
    name: data.squad.name,
    squadId: data.squad.id,
    color: data.squad.color,
    leader,
    memberCount: data.members.length,
    tags: [],
    volume: Number(data.squad.volume) || 0,
    pnl: Number(data.squad.pnl) || 0,
  } as SquadType;

  const members = data.members.map((item) => ({
    walletAddress: item.wallet_address,
    role: item.role,
    alias: item.alias,
    joinedAt: item.joined_at,
    pnl: Number(item.pnl) || 0,
    volume: Number(item.volume) || 0,
  })) as MemberType[];

  return {
    squad,
    members: members,
    leaderWallet: leaderRow?.wallet_address ?? '',
  };
};

const joinSquadOpen = async (squadId: string) => {
  const res = await postRequest(Route.joinSquadOpen(squadId), {});
  return res.data;
};

const getHeatmap = async (
  squadId: string,
): Promise<SquadHeatmapResponseType> => {
  const res = await getRequest(Route.getHeatmap(squadId));
  return res.data as SquadHeatmapResponseType;
};

const get24hrLeaderboard = async (): Promise<SquadLeaderboardResponseType> => {
  const res = await getRequest(Route.get24hrLeaderboard);
  return res.data as SquadLeaderboardResponseType;
};

const getTotalLeaderboard = async (): Promise<SquadLeaderboardResponseType> => {
  const res = await getRequest(Route.getTotalLeaderboard);
  return res.data as SquadLeaderboardResponseType;
};

const leaveSquad = async (squadId: string) => {
  await deleteRequest(Route.leaveSquad(squadId));
};

const kickMember = async (squadId: string, targetWalletAddress: string) => {
  await deleteRequest(Route.kickMember(squadId, targetWalletAddress));
};

const editSquad = async (id: string, payload: FormData) => {
  const res = await patchRequest(Route.editSquad(id), payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export default {
  createSquad,
  getMySquad,
  getSquadByPage,
  getSquadById,
  getHeatmap,
  get24hrLeaderboard,
  getTotalLeaderboard,
  joinSquadOpen,
  leaveSquad,
  kickMember,
  editSquad,
};
