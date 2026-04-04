import { useMemo, useState } from 'react';

import OpenOrdersTab from '@/components/PositionPanel/OpenOrdersTab/OpenOrdersTab';
import OrderHistoryTab from '@/components/PositionPanel/OrderHistoryTab/OrderHistoryTab';
import PositionsTab from '@/components/PositionPanel/PositionsTab/PositionsTab';
import TradingHistoryTab from '@/components/PositionPanel/TradingHistoryTab/TradingHistoryTab';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import type { PacificaMarketInfo } from '@/utils/helpers/PacificaHelper';

import './PositionPanel.scss';

type TabKey = 'positions' | 'openOrders' | 'tradeHistory' | 'orderHistory';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'positions', label: 'Positions' },
  { key: 'openOrders', label: 'Open_Orders' },
  { key: 'tradeHistory', label: 'Trade_History' },
  { key: 'orderHistory', label: 'Order_History' },
];

type PositionPanelProps = {
  markets?: PacificaMarketInfo[];
  /** Chart market; used when switching to Positions / Open Orders tabs to sync `?token=`. */
  selectedMarket?: string;
  /** Sets chart market and `/trade?token=` (row clicks pass the row symbol). */
  onSelectSymbol?: (symbol: string) => void;
};

const PositionPanel = ({
  markets,
  selectedMarket = '',
  onSelectSymbol,
}: PositionPanelProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>('positions');
  const [showAllHistory, setShowAllHistory] = useState(false);

  const activeLabel = useMemo(
    () => TABS.find((t) => t.key === activeTab)?.label ?? 'Positions',
    [activeTab],
  );

  const showHistoryFilters =
    activeTab === 'tradeHistory' || activeTab === 'orderHistory';

  return (
    <div className="position-panel">
      <div className="position-panel-tab-row">
        <div className="position-panel-tabs" role="tablist">
          {TABS.map((t) => (
            <ButtonDiv
              key={t.key}
              role="tab"
              aria-selected={t.key === activeTab}
              className={t.key === activeTab ? 'tab active' : 'tab'}
              onClick={() => {
                setActiveTab(t.key);
                if (
                  (t.key === 'positions' ||
                    t.key === 'openOrders' ||
                    t.key === 'tradeHistory' ||
                    t.key === 'orderHistory') &&
                  selectedMarket &&
                  onSelectSymbol
                ) {
                  onSelectSymbol(selectedMarket);
                }
              }}
            >
              {t.label}
            </ButtonDiv>
          ))}
        </div>
        {showHistoryFilters ? (
          <label className="position-panel-show-all">
            <span className="position-panel-show-all-label">{'show_all'}</span>
            <span className="position-panel-show-all-control">
              <input
                type="checkbox"
                className="position-panel-show-all-input"
                checked={showAllHistory}
                onChange={(e) => setShowAllHistory(e.target.checked)}
              />
              <span className="position-panel-show-all-box" aria-hidden="true" />
            </span>
          </label>
        ) : null}
      </div>

      <div className="position-panel-body" role="tabpanel">
        {activeTab === 'positions' ? (
          <PositionsTab markets={markets} onSelectSymbol={onSelectSymbol} />
        ) : activeTab === 'openOrders' ? (
          <OpenOrdersTab onSelectSymbol={onSelectSymbol} />
        ) : activeTab === 'tradeHistory' ? (
          <TradingHistoryTab
            selectedMarket={selectedMarket}
            showAll={showAllHistory}
            onSelectSymbol={onSelectSymbol}
          />
        ) : activeTab === 'orderHistory' ? (
          <OrderHistoryTab
            selectedMarket={selectedMarket}
            showAll={showAllHistory}
            onSelectSymbol={onSelectSymbol}
          />
        ) : (
          <div className="empty">{`${activeLabel} — coming soon`}</div>
        )}
      </div>
    </div>
  );
};

export default PositionPanel;
