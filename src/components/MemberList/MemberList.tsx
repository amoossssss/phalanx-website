import { useEffect, useState } from 'react';

import SquadMemberCard from '@/components/SquadMemberCard/SquadMemberCard';

import PacificaHelper from '@/utils/helpers/PacificaHelper';
import { MemberType } from '@/utils/constants/Types';

import './MemberList.scss';

type MemberListProps = {
  members: MemberType[];
  isLeader: boolean;
  currentWalletAddress: string;
  onKickMember: (member: MemberType) => void;
  squadColor: string;
};

const MemberList = ({
  members,
  isLeader,
  currentWalletAddress,
  onKickMember,
  squadColor,
}: MemberListProps) => {
  const [tickBySymbol, setTickBySymbol] = useState<
    Record<string, string | number>
  >({});
  const [maxLeverageBySymbol, setMaxLeverageBySymbol] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    let cancelled = false;
    void PacificaHelper.getMarkets()
      .then((markets) => {
        if (cancelled) return;
        const ticks: Record<string, string | number> = {};
        const maxLev: Record<string, number> = {};
        for (const m of markets) {
          const sym = m.symbol;
          if (!sym) continue;
          if (m.tick_size !== undefined && m.tick_size !== null) {
            ticks[sym] = m.tick_size;
          }
          const raw = m.max_leverage;
          const n = typeof raw === 'number' ? raw : Number(raw);
          if (Number.isFinite(n) && n > 0) maxLev[sym] = Math.floor(n);
        }
        setTickBySymbol(ticks);
        setMaxLeverageBySymbol(maxLev);
      })
      .catch(() => {
        if (!cancelled) {
          setTickBySymbol({});
          setMaxLeverageBySymbol({});
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="member-list">
      {members.map((member) => {
        const canKick =
          isLeader &&
          member.role === 'member' &&
          member.walletAddress !== currentWalletAddress;

        return (
          <SquadMemberCard
            key={member.walletAddress}
            member={member}
            canKick={canKick}
            onKickMember={onKickMember}
            squadColor={squadColor}
            tickBySymbol={tickBySymbol}
            maxLeverageBySymbol={maxLeverageBySymbol}
          />
        );
      })}
    </div>
  );
};

export default MemberList;
