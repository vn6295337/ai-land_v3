import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { ComponentProps } from '../../types/ui';
import { useModelsStore, modelsSelectors } from '../../stores/modelsStore';

export interface PaginationProps extends ComponentProps {
  showInfo?: boolean;
  maxPageButtons?: number;
}

export const Pagination: React.FC<PaginationProps> = React.memo(({
  showInfo = true,
  maxPageButtons = 7,
  className = '',
  testId = 'pagination'
}) => {
  const {
    currentPage,
    setPage,
    nextPage,
    prevPage
  } = useModelsStore();

  const paginationInfo = modelsSelectors.getPaginationInfo(useModelsStore.getState());

  if (paginationInfo.totalPages <= 1) {
    return null;
  }

  const getPageNumbers = () => {
    const { currentPage, totalPages } = paginationInfo;
    const pages: (number | 'ellipsis')[] = [];

    if (totalPages <= maxPageButtons) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      const startPage = Math.max(2, currentPage - 2);
      const endPage = Math.min(totalPages - 1, currentPage + 2);

      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pages.push('ellipsis');
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pages.push('ellipsis');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const renderPageButton = (page: number | 'ellipsis', index: number) => {
    if (page === 'ellipsis') {
      return (
        <div
          key={`ellipsis-${index}`}
          className="px-3 py-2 text-gray-500 dark:text-gray-400"
          data-testid={`${testId}-ellipsis-${index}`}
        >
          <MoreHorizontal className="w-4 h-4" />
        </div>
      );
    }

    const isActive = page === paginationInfo.currentPage;

    return (
      <button
        key={page}
        onClick={() => setPage(page)}
        className={`
          px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
          ${isActive
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }
        `}
        data-testid={`${testId}-page-${page}`}
        aria-label={`Go to page ${page}`}
        aria-current={isActive ? 'page' : undefined}
      >
        {page}
      </button>
    );
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}
      data-testid={testId}
    >
      {showInfo && (
        <div
          className="text-sm text-gray-700 dark:text-gray-300"
          data-testid={`${testId}-info`}
        >
          Showing{' '}
          <span className="font-medium">
            {((paginationInfo.currentPage - 1) * paginationInfo.itemsPerPage) + 1}
          </span>{' '}
          to{' '}
          <span className="font-medium">
            {Math.min(
              paginationInfo.currentPage * paginationInfo.itemsPerPage,
              paginationInfo.totalItems
            )}
          </span>{' '}
          of{' '}
          <span className="font-medium">{paginationInfo.totalItems}</span>{' '}
          results
        </div>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={prevPage}
          disabled={!paginationInfo.hasPrevPage}
          className="
            flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
            bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
            rounded-md hover:bg-gray-50 dark:hover:bg-gray-700
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
          "
          data-testid={`${testId}-prev`}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </button>

        <div className="flex items-center gap-1 mx-2">
          {getPageNumbers().map((page, index) => renderPageButton(page, index))}
        </div>

        <button
          onClick={nextPage}
          disabled={!paginationInfo.hasNextPage}
          className="
            flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
            bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
            rounded-md hover:bg-gray-50 dark:hover:bg-gray-700
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
          "
          data-testid={`${testId}-next`}
          aria-label="Go to next page"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
});

export default Pagination;