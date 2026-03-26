import Route from './route';

import { getRequest, postRequest } from '@/utils/api/axios/axiosMethod';

type NonceResponse = {
  wallet_address: string;
  nonce: string;
  issued_at: string;
  expires_in_ms: number;
  message: string;
  challenge_token: string;
};

type MeResponse = {
  wallet_address: string;
};

const getNonce = async (walletAddress: string) => {
  const res = await getRequest(Route.getNonce(walletAddress));
  return res.data as NonceResponse;
};

const verify = async (payload: {
  wallet_address: string;
  signature: string;
  nonce: string;
  issued_at: string;
  challenge_token: string;
}) => {
  const res = await postRequest(Route.verify, payload);
  return res.data as { ok: true; wallet_address: string };
};

const me = async () => {
  const res = await getRequest(Route.me);
  return res.data as MeResponse;
};

const logout = async () => {
  const res = await postRequest(Route.logout, {});
  return res.data as MeResponse;
};

export default {
  getNonce,
  verify,
  me,
  logout,
};
