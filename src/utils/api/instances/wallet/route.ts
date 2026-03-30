import ApiKey from '@/utils/api/ApiKey';
import PathHelper from '@/utils/helpers/PathHelper';

const updateAlias = PathHelper.createPath([ApiKey.wallet, ApiKey.alias]);

const getMyAlias = PathHelper.createPath([ApiKey.wallet, ApiKey.alias]);

export default { updateAlias, getMyAlias };
