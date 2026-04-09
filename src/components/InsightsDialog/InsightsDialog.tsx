import { useEffect, useState } from 'react';

import { Tweet } from 'react-tweet';
import 'react-tweet/theme.css';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';
import withColoredSvg from '@/lib/ColoredSvg/ColoredSvg';

import ApiService from '@/utils/api/ApiService';
import Media from '@/utils/constants/Media';
import type { TokenInsightResponse } from '@/utils/api/instances/insight/service';
import axios from 'axios';

import './InsightsDialog.scss';

const CloseIcon = withColoredSvg(Media.icons.closeIcon);

type InsightsDialogProps = {
  marketSymbol: string;
  close: () => void;
};

const InsightsDialog = ({ marketSymbol, close }: InsightsDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TokenInsightResponse | null>(null);

  useEffect(() => {
    if (!marketSymbol.trim()) {
      setLoading(false);
      setError('No market selected');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    ApiService.insight
      .getTokenInsight(marketSymbol)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = axios.isAxiosError(err)
          ? String(
              (err.response?.data as { error?: string } | undefined)?.error ??
                err.message,
            )
          : err instanceof Error
          ? err.message
          : 'Failed to load insights';
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [marketSymbol]);

  return (
    <dialog
      className="insights-dialog"
      open
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-content">
        <div className="dialog-title">{`<${marketSymbol}_Insights>`}</div>

        {loading && (
          <div className="insights-state">{'Loading_Insights...'}</div>
        )}

        {!loading && error && (
          <div className="insights-state insights-state--error">{error}</div>
        )}

        {!loading && !error && data && (
          <>
            {data.topMentions.length === 0 ? (
              <div className="insights-state">{'No_mentions_yet.'}</div>
            ) : (
              <>
                <ul className="insights-tweet-list">
                  {data.topMentions.map((m) => (
                    <li key={m.id} className="insights-tweet-item">
                      <div className="insights-tweet-embed" data-theme="dark">
                        <Tweet
                          id={m.tweet_id}
                          fallback={
                            <div className="insights-tweet-fallback">
                              {'Loading tweet…'}
                            </div>
                          }
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}

        <ButtonDiv className="close-button" onClick={close}>
          <CloseIcon color={'#ff51fa'} size={20} />
        </ButtonDiv>
      </div>
    </dialog>
  );
};

export default InsightsDialog;
