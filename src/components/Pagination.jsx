import { useEffect } from "react";
import "./Pagination.css";

export default function Pagination({
    page,
    pageCount,
    pageSize,
    totalItems,
    onPageChange,
}) {
    useEffect(() => {
        const validPage = Math.max(1, Math.min(page, pageCount));
        if (validPage !== page) onPageChange(validPage);
    }, [onPageChange, page, pageCount]);

    if (pageCount <= 1) return null;

    const firstItem = (page - 1) * pageSize + 1;
    const lastItem = Math.min(page * pageSize, totalItems);

    return (
        <nav className="pagination" aria-label="Pagination">
            <span className="pagination-summary">
                Showing {firstItem}–{lastItem} of {totalItems}
            </span>
            <div className="pagination-controls">
                <button
                    type="button"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    aria-label="Go to previous page"
                >
                    Previous
                </button>
                <span aria-current="page">
                    Page {page} of {pageCount}
                </span>
                <button
                    type="button"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === pageCount}
                    aria-label="Go to next page"
                >
                    Next
                </button>
            </div>
        </nav>
    );
}
