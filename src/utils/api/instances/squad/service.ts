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

type SquadListResponseType = {
  items: SquadResponseType[];
  page: number;
  page_size: number;
  total: number;
};

type SquadByIdResponseType = {
  squad: SquadRowType;
  members: MemberRowType[];
  avatar_url: string | null;
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
    ROI: 100, // TODO: change...
    PnL: 100, // TODO: change...
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
    ROI: 100, // TODO: change...
    PnL: 100, // TODO: change...
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
    ROI: 100, // TODO: change...
    PnL: 100, // TODO: change...
  } as SquadType;

  const members = data.members.map((item) => ({
    walletAddress: item.wallet_address,
    role: item.role,
    alias: item.alias,
    joinedAt: item.joined_at,
    pnl: null,
    roi: null,
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
  joinSquadOpen,
  leaveSquad,
  kickMember,
  editSquad,
};
