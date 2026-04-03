import { useMemo, useState } from 'react';

import PositionsTab from '@/components/PositionPanel/PositionsTab/PositionsTab';

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
};

const PositionPanel = ({ markets }: PositionPanelProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>('positions');

  const activeLabel = useMemo(
    () => TABS.find((t) => t.key === activeTab)?.label ?? 'Positions',
    [activeTab],
  );

  return (
    <div className="position-panel">
      <div className="position-panel-tabs" role="tablist">
        {TABS.map((t) => (
          <ButtonDiv
            key={t.key}
            role="tab"
            aria-selected={t.key === activeTab}
            className={t.key === activeTab ? 'tab active' : 'tab'}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </ButtonDiv>
        ))}
      </div>

      <div className="position-panel-body" role="tabpanel">
        {activeTab === 'positions' ? (
          <PositionsTab markets={markets} />
        ) : (
          <div className="empty">{`${activeLabel} — coming soon`}</div>
        )}
      </div>
    </div>
  );
};

export default PositionPanel;
