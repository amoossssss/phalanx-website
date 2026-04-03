import { useCallback, useMemo } from 'react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import useWindowSize from '@/utils/hooks/useWindowSize';

import './Pagination.scss';

type PageEntry = number | 'gap';

const buildPageList = (current: number, total: number): PageEntry[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const set = new Set<number>();
  set.add(1);
  set.add(total);
  for (let p = current - 1; p <= current + 1; p += 1) {
    if (p >= 1 && p <= total) {
      set.add(p);
    }
  }

  const sorted = [...Array.from(set)].sort((a, b) => a - b);
  const out: PageEntry[] = [];

  for (let i = 0; i < sorted.length; i += 1) {
    out.push(sorted[i]);
    const next = sorted[i + 1];
    if (next !== undefined && next - sorted[i] > 1) {
      out.push('gap');
    }
  }

  return out;
};

type PaginationProps = {
  currentPage: number;
  totalPage: number;
  fetchData: (page: number) => void | Promise<void>;
};

const Pagination = ({ currentPage, totalPage, fetchData }: PaginationProps) => {
  const { isWindowSmall } = useWindowSize();

  const goTo = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPage || page === currentPage) {
        return;
      }
      void Promise.resolve(fetchData(page));
    },
    [currentPage, totalPage, fetchData],
  );

  const pages = useMemo(
    () => buildPageList(currentPage, totalPage),
    [currentPage, totalPage],
  );

  if (totalPage < 1) {
    return null;
  }

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPage;

  return (
    <div className="pagination">
      <div className="nav">
        <ButtonDiv
          className="edge"
          disabled={!canPrev}
          onClick={() => goTo(currentPage - 1)}
        >
          {isWindowSmall ? '<' : '<Prev>'}
        </ButtonDiv>

        <div className="pages">
          {pages.map((entry, index) =>
            entry === 'gap' ? (
              <span key={`gap-${index}`} className="gap">
                …
              </span>
            ) : (
              <ButtonDiv
                key={entry}
                className={`page ${entry === currentPage ? 'active' : ''}`}
                onClick={() => goTo(entry)}
              >
                {entry}
              </ButtonDiv>
            ),
          )}
        </div>

        <ButtonDiv
          className="edge"
          disabled={!canNext}
          onClick={() => goTo(currentPage + 1)}
        >
          {isWindowSmall ? '>' : '<Next>'}
        </ButtonDiv>
      </div>
    </div>
  );
};

export default Pagination;
