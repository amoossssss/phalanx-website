import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import CreateSquadDialog from '@/components/CreateSquadDialog/CreateSquadDialog';
import SquadCard from '@/components/SquadCard/SquadCard';
import SquadCardSkeleton from '@/components/SquadCard/SquadCardSkeleton';
import Pagination from '@/components/Pagination/Pagination';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import ApiService from '@/utils/api/ApiService';
import { SquadType } from '@/utils/constants/Types';
import { useUser } from '@/utils/contexts/UserContext';

import './Squad.scss';

const Squad = () => {
  const navigate = useNavigate();
  const { mySquad } = useUser();
  const [squadList, setSquadList] = useState<SquadType[]>([]);
  const [isSquadListLoading, setIsSquadListLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPage, setTotalPage] = useState(0);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchSquadList = useCallback(async () => {
    setIsSquadListLoading(true);
    try {
      const res = await ApiService.squad.getSquadByPage(currentPage);
      setSquadList(res.squadList);
      setTotalPage(res.totalPages);
    } finally {
      setIsSquadListLoading(false);
    }
  }, [currentPage]);

  const handleCreateSquad = () => {
    if (mySquad !== null) return;
    setIsCreateDialogOpen(true);
  };

  const handleViewSquad = () => {
    if (!mySquad) return;
    navigate(`/squad/${mySquad.squadId}`);
  };

  useEffect(() => {
    if (isCreateDialogOpen) return;
    fetchSquadList();
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
          {isSquadListLoading
            ? Array.from({ length: 3 }, (_, i) => (
                <SquadCardSkeleton key={`squad-card-skeleton-${i}`} />
              ))
            : squadList.map((item) => (
                <SquadCard
                  key={item.squadId}
                  isMySquad={mySquad?.squadId === item.squadId}
                  refreshSquadList={fetchSquadList}
                  {...item}
                />
              ))}
        </div>

        {!isSquadListLoading && (
          <Pagination
            currentPage={currentPage}
            totalPage={totalPage}
            fetchData={fetchSquadList}
          />
        )}
      </div>

      {isCreateDialogOpen && (
        <CreateSquadDialog close={() => setIsCreateDialogOpen(false)} />
      )}
    </div>
  );
};

export default Squad;
