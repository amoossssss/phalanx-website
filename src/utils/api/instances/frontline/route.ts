import ApiKey from '@/utils/api/ApiKey';
import PathHelper from '@/utils/helpers/PathHelper';

const list = PathHelper.createPath([ApiKey.frontline, ApiKey.list]);

const rankings = (frontlineId: string) =>
  PathHelper.createPath([ApiKey.frontline, frontlineId, ApiKey.rankings]);

const squadRanking = (frontlineId: string, squadId: string) =>
  PathHelper.createPath([
    ApiKey.frontline,
    frontlineId,
    ApiKey.squad,
    squadId,
    ApiKey.ranking,
  ]);

export default {
  list,
  rankings,
  squadRanking,
};
