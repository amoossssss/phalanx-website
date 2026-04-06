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

  useEffect(() => {
    let cancelled = false;
    void PacificaHelper.getMarkets()
      .then((markets) => {
        if (cancelled) return;
        const next: Record<string, string | number> = {};
        for (const m of markets) {
          const sym = m.symbol;
          if (!sym || m.tick_size === undefined || m.tick_size === null)
            continue;
          next[sym] = m.tick_size;
        }
        setTickBySymbol(next);
      })
      .catch(() => {
        if (!cancelled) setTickBySymbol({});
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
          />
        );
      })}
    </div>
  );
};

export default MemberList;
