import React from 'react';

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export const AdminPagination: React.FC<AdminPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const startItem = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
      <p className="text-sm text-slate-400">
        Mostrando {startItem} - {endItem} de {totalItems} resultados
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="min-h-[44px] px-3 py-1.5 rounded-lg border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 text-slate-300 text-sm transition-colors"
        >
          Anterior
        </button>
        <span className="flex items-center px-3 py-1 text-sm text-slate-400">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="min-h-[44px] px-3 py-1.5 rounded-lg border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 text-slate-300 text-sm transition-colors"
        >
          Próxima
        </button>
      </div>
    </div>
  );
};
