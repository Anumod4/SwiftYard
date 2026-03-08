
import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalRecords: number;
    pageSize: number;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    totalRecords,
    pageSize
}) => {
    if (totalPages <= 1) return null;

    const startRecord = (currentPage - 1) * pageSize + 1;
    const endRecord = Math.min(currentPage * pageSize, totalRecords);

    // Generate page numbers to show
    const getPageNumbers = () => {
        const pages = [];
        const maxShown = 5;

        if (totalPages <= maxShown) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            let start = Math.max(1, currentPage - 2);
            let end = Math.min(totalPages, start + maxShown - 1);

            if (end === totalPages) {
                start = Math.max(1, end - maxShown + 1);
            }

            for (let i = start; i <= end; i++) pages.push(i);
        }
        return pages;
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 px-2 py-4 border-t border-slate-200 dark:border-white/5">
            <div className="text-sm text-slate-500 dark:text-gray-400 font-medium">
                Showing <span className="text-slate-900 dark:text-white font-bold">{startRecord}</span> to <span className="text-slate-900 dark:text-white font-bold">{endRecord}</span> of <span className="text-slate-900 dark:text-white font-bold">{totalRecords}</span> records
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="First Page"
                >
                    <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Previous Page"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1 mx-2">
                    {getPageNumbers().map(p => (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={`min-w-[36px] h-9 rounded-xl text-sm font-bold transition-all ${currentPage === p
                                    ? 'bg-[#3B82F6] text-white shadow-lg shadow-blue-500/30'
                                    : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                    {totalPages > 5 && getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                        <>
                            <span className="text-slate-400 px-1">...</span>
                            <button
                                onClick={() => onPageChange(totalPages)}
                                className="min-w-[36px] h-9 rounded-xl text-sm font-bold text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                            >
                                {totalPages}
                            </button>
                        </>
                    )}
                </div>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Next Page"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Last Page"
                >
                    <ChevronsRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
