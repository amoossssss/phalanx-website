import Route from './route';
import { getRequest } from '@/utils/api/axios/axiosMethod';

/** One stored top-mention row as returned by `GET /api/insight/token/:tokenName`. */
export type ElfaTopMentionItem = {
  id: string;
  token_symbol: string;
  tweet_id: string;
  link: string;
  created_at: string;
};

/** Response body from `getTokenInsight` (matches backend `GetTokenNewsResult`). */
export type TokenInsightResponse = {
  tokenSymbol: string;
  /** `cache` = served from DB without calling Elfa; `api` = fetched from Elfa then persisted */
  source: 'cache' | 'api';
  topMentions: ElfaTopMentionItem[];
};

const getTokenInsight = async (
  tokenName: string,
): Promise<TokenInsightResponse> => {
  const res = await getRequest(Route.getTokenInsight(tokenName));
  const data: TokenInsightResponse = res.data;
  return data;
};

export default { getTokenInsight };
