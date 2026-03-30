import Route from './route';
import { getRequest, postRequest } from '@/utils/api/axios/axiosMethod';

type AliasResponseType = {
  alias: string | null;
};

const updateAlias = async (payload: { alias: string }) => {
  const res = await postRequest(Route.updateAlias, payload);
  return res.data;
};

const getMyAlias = async () => {
  const res = await getRequest(Route.getMyAlias);
  const data: AliasResponseType = res.data;
  return data.alias;
};

export default { updateAlias, getMyAlias };
