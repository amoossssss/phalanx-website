import { useMemo, useState } from 'react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import './PositionPanel.scss';

type TabKey = 'positions' | 'openOrders' | 'tradeHistory' | 'orderHistory';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'positions', label: 'Positions' },
  { key: 'openOrders', label: 'Open_Orders' },
  { key: 'tradeHistory', label: 'Trade_History' },
  { key: 'orderHistory', label: 'Order_History' },
];

const PositionPanel = () => {
  const [active, setActive] = useState<TabKey>('positions');

  const activeLabel = useMemo(
    () => TABS.find((t) => t.key === active)?.label ?? 'Positions',
    [active],
  );

  return (
    <div className="position-panel">
      <div className="position-panel-tabs" role="tablist">
        {TABS.map((t) => (
          <ButtonDiv
            key={t.key}
            role="tab"
            aria-selected={t.key === active}
            className={t.key === active ? 'tab active' : 'tab'}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </ButtonDiv>
        ))}
      </div>

      <div className="position-panel-body" role="tabpanel">
        <div className="empty">{`${activeLabel} — coming soon`}</div>
      </div>
    </div>
  );
};

export default PositionPanel;
