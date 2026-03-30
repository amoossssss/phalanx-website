import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import StringHelper from '@/utils/helpers/StringHelper';
import { MemberType } from '@/utils/constants/Types';

import './MemberList.scss';

type MemberListProps = {
  members: MemberType[];
  isLeader: boolean;
  currentWalletAddress: string;
  onKickMember: (targetWallet: string) => void | Promise<void>;
};

const memberDisplayLabel = (member: MemberType) => {
  if (member.alias?.trim()) {
    return `@${member.alias.trim()}`;
  }
  return `@${StringHelper.truncateAddress(member.walletAddress)}`;
};

const MemberList = ({
  members,
  isLeader,
  currentWalletAddress,
  onKickMember,
}: MemberListProps) => {
  return (
    <div className="member-list">
      <div className="member-table">
        <div className="member-row table-header">
          <div className="col col-member">{'Member'}</div>
          <div className="col col-role">{'Role'}</div>
          <div className="col col-roi">{'ROI'}</div>
          <div className="col col-pnl">{'PnL'}</div>
          {isLeader && <div className="col col-action" aria-hidden />}
        </div>

        {members.map((member) => {
          const canKick =
            isLeader &&
            member.role === 'member' &&
            member.walletAddress !== currentWalletAddress;

          return (
            <div className="member-row" key={member.walletAddress}>
              <div className="col col-member" title={member.walletAddress}>
                {memberDisplayLabel(member)}
              </div>
              <div className="col col-role">
                <span className={`role-badge role-${member.role}`}>
                  {member.role === 'captain' ? '<Captain>' : '<Member>'}
                </span>
              </div>
              <div className="col col-roi">
                {StringHelper.formatStat(member.roi, '%')}
              </div>
              <div className="col col-pnl">
                {StringHelper.formatStat(member.pnl)}
              </div>
              {isLeader && (
                <div className="col col-action">
                  {canKick ? (
                    <ButtonDiv
                      className="kick-button"
                      onClick={() => onKickMember(member.walletAddress)}
                    >
                      {'Kick'}
                    </ButtonDiv>
                  ) : (
                    <span className="action-placeholder" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MemberList;
