import ApiKey from '@/utils/api/ApiKey';
import PathHelper from '@/utils/helpers/PathHelper';

const getTokenInsight = (tokenName: string) =>
  PathHelper.createPath([ApiKey.insight, ApiKey.token, tokenName]);

export default { getTokenInsight };
