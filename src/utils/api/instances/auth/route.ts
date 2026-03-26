import ApiKey from '../../ApiKey';

import PathHelper from '@/utils/helpers/PathHelper';

const getNonce = (walletAddress: string) => {
  return PathHelper.createPath([ApiKey.auth, ApiKey.nonce, walletAddress]);
};

const verify = PathHelper.createPath([ApiKey.auth, ApiKey.verify]);

const me = PathHelper.createPath([ApiKey.auth, ApiKey.me]);

const logout = PathHelper.createPath([ApiKey.auth, ApiKey.logout]);

export default {
  getNonce,
  verify,
  me,
  logout,
};
