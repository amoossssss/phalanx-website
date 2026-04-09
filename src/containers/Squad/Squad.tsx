import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import CreateSquadDialog from '@/components/CreateSquadDialog/CreateSquadDialog';
import SquadCard from '@/components/SquadCard/SquadCard';
import SquadCardSkeleton from '@/components/SquadCard/SquadCardSkeleton';
import Pagination from '@/components/Pagination/Pagination';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import ApiService from '@/utils/api/ApiService';
import useNotification from '@/utils/hooks/useNotification';
import { SquadType } from '@/utils/constants/Types';
import { useUser } from '@/utils/contexts/UserContext';
import { useAuth } from '@/utils/contexts/AuthContext';

import './Squad.scss';

const Squad = () => {
  const navigate = useNavigate();
  const { mySquad } = useUser();
  const { isLogin } = useAuth();
  const { snackbar } = useNotification();

  const [squadList, setSquadList] = useState<SquadType[]>([]);
  const [isSquadListLoading, setIsSquadListLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPage, setTotalPage] = useState(0);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchSquadList = useCallback(
    async ({ silent = false }: { silent: boolean }) => {
      if (!silent) {
        setIsSquadListLoading(true);
      }
      try {
        const res = await ApiService.squad.getSquadByPage(currentPage);
        setSquadList(res.squadList);
        setTotalPage(res.totalPages);
      } finally {
        setIsSquadListLoading(false);
      }
    },
    [currentPage],
  );

  const handleCreateSquad = () => {
    if (!isLogin) {
      snackbar.error('Connect wallet to create squad.');
      return;
    }
    if (mySquad !== null) return;
    setIsCreateDialogOpen(true);
  };

  const handleViewSquad = () => {
    if (!mySquad) return;
    navigate(`/squad/${mySquad.squadId}`);
  };

  useEffect(() => {
    if (isCreateDialogOpen) return;
    fetchSquadList({ silent: true });
  }, [isCreateDialogOpen, fetchSquadList]);

  return (
    <div className="squad">
      <div className="squad-title-container">
        <div className="squad-title">{'Squad_Hall'}</div>
        <ButtonDiv
          className="squad-button"
          onClick={mySquad ? handleViewSquad : handleCreateSquad}
        >
          {mySquad ? mySquad.name : '<Create_Squad>'}
          {mySquad && <div className="tag">{'<My_Squad>'}</div>}
        </ButtonDiv>
      </div>

      <div className="squad-content">
        <div className="squad-list">
          <div
            className={`squad-list__skeleton${
              isSquadListLoading ? ' squad-list__skeleton--visible' : ''
            }`}
            aria-hidden={!isSquadListLoading}
          >
            {Array.from({ length: 3 }, (_, i) => (
              <SquadCardSkeleton key={`squad-card-skeleton-${i}`} />
            ))}
          </div>
          <div
            className={`squad-list__cards${
              !isSquadListLoading ? ' squad-list__cards--visible' : ''
            }`}
          >
            {!isSquadListLoading &&
              squadList.map((item) => (
                <SquadCard
                  key={item.squadId}
                  isMySquad={mySquad?.squadId === item.squadId}
                  refreshSquadList={() => fetchSquadList({ silent: false })}
                  {...item}
                />
              ))}
          </div>
        </div>

        <div
          className={`squad-pagination-wrap${
            !isSquadListLoading ? ' squad-pagination-wrap--visible' : ''
          }`}
        >
          {!isSquadListLoading && (
            <Pagination
              currentPage={currentPage}
              totalPage={totalPage}
              fetchData={() => fetchSquadList({ silent: false })}
            />
          )}
        </div>
      </div>

      {isCreateDialogOpen && (
        <CreateSquadDialog close={() => setIsCreateDialogOpen(false)} />
      )}
    </div>
  );
};

export default Squad;
