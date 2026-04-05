import ApiKey from '@/utils/api/ApiKey';
import PathHelper from '@/utils/helpers/PathHelper';

const createSquad = PathHelper.createPath([ApiKey.squads]);

const editSquad = (id: string) => PathHelper.createPath([ApiKey.squads, id]);

const getSquadById = (id: string) => PathHelper.createPath([ApiKey.squads, id]);

const getMySquad = PathHelper.createPath([ApiKey.squads, ApiKey.my]);

const getSquadByPage = (page: number | string) => {
  const path = PathHelper.createPath([ApiKey.squads, ApiKey.list]);
  return `${path}?${ApiKey.page}=${page}`;
};

const joinSquadOpen = (squadId: string) =>
  PathHelper.createPath([ApiKey.squads, squadId, ApiKey.joinOpen]);

const leaveSquad = (squadId: string) =>
  PathHelper.createPath([ApiKey.squads, squadId, ApiKey.leave]);

const kickMember = (squadId: string, targetWallet: string) =>
  PathHelper.createPath([ApiKey.squads, squadId, 'members', targetWallet]);

export default {
  createSquad,
  editSquad,
  getSquadById,
  getMySquad,
  getSquadByPage,
  joinSquadOpen,
  leaveSquad,
  kickMember,
};
