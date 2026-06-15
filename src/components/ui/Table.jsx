"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
} from "lucide-react";
import Typo from "./typo";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getColumnSpan(col) {
  return Number(col?.colSpan || col?.span || 1);
}

function getColumnMinWidth(col) {
  return col?.minWidth || col?.width || "120px";
}

function getColumnMaxWidth(col) {
  return col?.maxWidth || "1fr";
}

function getGridTemplateColumns(columns = []) {
  const tracks = [];

  columns.forEach((col) => {
    const span = getColumnSpan(col);
    const minWidth = getColumnMinWidth(col);
    const maxWidth = getColumnMaxWidth(col);

    for (let i = 0; i < span; i++) {
      tracks.push(`minmax(${minWidth}, ${maxWidth})`);
    }
  });

  return tracks.join(" ");
}

function getGridColumn(col) {
  const span = getColumnSpan(col);
  return span > 1 ? `span ${span} / span ${span}` : undefined;
}

export default function Table({
  columns = [],
  data = [],
  loading = false,
  sortable = true,
  paginated = true,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50],
  mobileCard = true,
  className = "",
  emptyText = "No data found",
  loadingText = "Loading data...",
  onRowClick,
  keyExtractor = (row, i) => row?._id || row?.id || i,
  rowClassName,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(pageSize);

  useEffect(() => {
    setPerPage(pageSize);
  }, [pageSize]);

  const safeData = Array.isArray(data) ? data : [];
  const safeColumns = Array.isArray(columns) ? columns : [];

  const handleSort = (key) => {
    if (!sortable || !key) return;

    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }

    setPage(1);
  };

  const sorted = useMemo(() => {
    if (!sortKey) return safeData;

    return [...safeData].sort((a, b) => {
      const aVal = a?.[sortKey];
      const bVal = b?.[sortKey];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let cmp = 0;

      if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }

      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [safeData, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const startIndex = (page - 1) * perPage;

  const paginatedData = paginated
    ? sorted.slice(startIndex, startIndex + perPage)
    : sorted;

  const handlePageChange = (p) => {
    setPage(Math.max(1, Math.min(totalPages, p)));
  };

  return (
    <div
      className={cn(
        "w-full min-w-0 overflow-hidden rounded-[10px] border border-[#e3e6ee] bg-white shadow-[0_4px_12px_rgba(15,23,42,0.03)]",
        className
      )}
    >
      {mobileCard ? (
        <>
          <div className="hidden min-[600px]:block w-full min-w-0">
            <DesktopTable
              columns={safeColumns}
              data={paginatedData}
              loading={loading}
              sortable={sortable}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              emptyText={emptyText}
              loadingText={loadingText}
              onRowClick={onRowClick}
              keyExtractor={keyExtractor}
              rowClassName={rowClassName}
            />
          </div>

          <div className="block min-[600px]:hidden w-full min-w-0">
            <MobileCards
              columns={safeColumns}
              data={paginatedData}
              loading={loading}
              emptyText={emptyText}
              loadingText={loadingText}
              onRowClick={onRowClick}
              keyExtractor={keyExtractor}
            />
          </div>
        </>
      ) : (
        <div className="w-full min-w-0">
          <DesktopTable
            columns={safeColumns}
            data={paginatedData}
            loading={loading}
            sortable={sortable}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            emptyText={emptyText}
            loadingText={loadingText}
            onRowClick={onRowClick}
            keyExtractor={keyExtractor}
            rowClassName={rowClassName}
          />
        </div>
      )}

      {paginated && safeData.length > 0 && (
        <Pagination
          total={sorted.length}
          page={page}
          totalPages={totalPages}
          startIndex={startIndex}
          currentCount={paginatedData.length}
          perPage={perPage}
          pageSizeOptions={pageSizeOptions}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => {
            setPerPage(size);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}

function DesktopTable({
  columns,
  data,
  loading,
  sortable,
  sortKey,
  sortDir,
  onSort,
  emptyText,
  loadingText,
  onRowClick,
  keyExtractor,
  rowClassName,
}) {
  const gridTemplateColumns = useMemo(
    () => getGridTemplateColumns(columns),
    [columns]
  );

  const totalGridColumns = useMemo(() => {
    return columns.reduce((total, col) => total + getColumnSpan(col), 0);
  }, [columns]);

  return (
    <div className="w-full min-w-0 overflow-auto">
      <div
        className="grid w-full min-w-0 border-b border-[#e3e6ee] bg-[#fcfcfd]"
        style={{
          gridTemplateColumns,
        }}
      >
        {columns.map((col, i) => {
          const active = sortKey === col.key;
          const SortIcon = active
            ? sortDir === "asc"
              ? ChevronUp
              : ChevronDown
            : ChevronsUpDown;

          const canSort = sortable && col.sortable !== false && col.key;

          return (
            <button
              key={col.key || i}
              type="button"
              title={col.label}
              disabled={!canSort}
              onClick={() => {
                if (canSort) onSort(col.key);
              }}
              className={cn(
                "flex min-h-[36px] min-w-0 items-center border-r border-[#eef0f5] px-2 py-2 text-left last:border-r-0 lg:px-3",
                canSort ? "cursor-pointer select-none hover:text-[#ff4b0b]" : "cursor-default",
                col.align === "right"
                  ? "justify-end text-right"
                  : col.align === "center"
                  ? "justify-center text-center"
                  : "justify-start text-left"
              )}
              style={{
                gridColumn: getGridColumn(col),
              }}
            >
              <div
                className={cn(
                  "flex min-w-0 items-center gap-1.5",
                  col.align === "right"
                    ? "justify-end"
                    : col.align === "center"
                    ? "justify-center"
                    : "justify-start"
                )}
              >
                  <span
                    title={col.label}
                    className="min-w-0 truncate text-[9px] font-bold uppercase tracking-[0.04em] text-[#071033]"
                  >
                    {col.label}
                  </span>

                {canSort && (
                  <SortIcon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      active ? "text-[#ff4b0b]" : "text-[#b6bdcf]"
                    )}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="w-full min-w-0">
        {loading ? (
          <div
            className="grid min-h-[96px] w-full place-items-center"
            style={{
              gridTemplateColumns,
            }}
          >
            <div
              className="flex min-w-0 items-center justify-center gap-2 px-4 py-8"
              style={{
                gridColumn: `span ${totalGridColumns} / span ${totalGridColumns}`,
              }}
            >
              <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#e3e6ee] border-t-[#ff4b0b]" />
              <Typo
                variant="body"
                className="min-w-0 !text-[14px] !font-semibold !text-[#60677c]"
              >
                {loadingText}
              </Typo>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div
            className="grid min-h-[96px] w-full place-items-center"
            style={{
              gridTemplateColumns,
            }}
          >
            <div
              className="px-4 py-8 text-center"
              style={{
                gridColumn: `span ${totalGridColumns} / span ${totalGridColumns}`,
              }}
            >
              <Typo
                variant="body"
                className="!text-[14px] !font-semibold !text-[#60677c]"
              >
                {emptyText}
              </Typo>
            </div>
          </div>
        ) : (
          data.map((row, i) => {
            const clickable = Boolean(onRowClick);
            const customRowClass =
              typeof rowClassName === "function"
                ? rowClassName(row, i)
                : rowClassName;

            return (
              <div
                key={keyExtractor(row, i)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "grid w-full min-w-0 border-b border-[#e9ebf2] transition last:border-b-0 hover:bg-[#fcfcfd]",
                  clickable ? "cursor-pointer" : "",
                  customRowClass
                )}
                style={{
                  gridTemplateColumns,
                }}
              >
                {columns.map((col, j) => {
                  const value = col.render ? col.render(row, i) : row?.[col.key];

                  return (
                    <div
                      key={col.key || j}
                      className={cn(
                        "flex min-h-[42px] min-w-0 items-center border-r border-[#f2f3f7] px-2 py-2 last:border-r-0 lg:px-3",
                        col.align === "right"
                          ? "justify-end text-right"
                          : col.align === "center"
                          ? "justify-center text-center"
                          : "justify-start text-left"
                      )}
                      style={{
                        gridColumn: getGridColumn(col),
                      }}
                    >
                      <div
                        className={cn(
                          "min-w-0 max-w-full text-[11px] font-medium text-[#343b52]",
                          col.noWrap
                            ? "truncate whitespace-nowrap"
                            : "break-words [overflow-wrap:anywhere]"
                        )}
                      >
                        {value ?? "-"}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function MobileCards({
  columns,
  data,
  loading,
  emptyText,
  loadingText,
  onRowClick,
  keyExtractor,
}) {
  if (loading) {
    return (
      <div className="flex min-w-0 items-center justify-center gap-2 px-4 py-12">
        <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#e3e6ee] border-t-[#ff4b0b]" />
        <Typo
          variant="body"
          className="min-w-0 !text-[14px] !font-semibold !text-[#60677c]"
        >
          {loadingText}
        </Typo>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <Typo
          variant="body"
          className="!text-[14px] !font-semibold !text-[#60677c]"
        >
          {emptyText}
        </Typo>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-2 p-2">
      {data.map((row, i) => (
        <div
          key={keyExtractor(row, i)}
          onClick={() => onRowClick?.(row)}
          className={cn(
            "w-full min-w-0 rounded-[12px] border border-[#e5e7ef] bg-white p-2.5 shadow-[0_4px_12px_rgba(15,23,42,0.03)]",
            onRowClick ? "cursor-pointer active:scale-[0.99]" : ""
          )}
        >
          {columns.map((col, j) => {
            if (col.hideOnMobile) return null;

            const value = col.render ? col.render(row, i) : row?.[col.key];

            return (
              <div
                key={col.key || j}
                className={cn(
                  "grid min-w-0 grid-cols-[minmax(80px,35%)_minmax(0,1fr)] gap-2 py-1.5",
                  j < columns.length - 1 ? "border-b border-[#f0f1f5]" : ""
                )}
              >
                <span
                  title={col.mobileLabel || col.label}
                  className="min-w-0 shrink-0 break-words text-[10px] font-bold text-[#8b93a8]"
                >
                  {col.mobileLabel || col.label}
                </span>

                <div
                  className={cn(
                    "min-w-0 text-right text-[11px] font-medium text-[#343b52] [overflow-wrap:anywhere]",
                    col.noWrap ? "truncate whitespace-nowrap" : "break-words"
                  )}
                >
                  {value ?? "-"}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Pagination({
  total,
  page,
  totalPages,
  startIndex,
  currentCount,
  perPage,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}) {
  const visiblePages = useMemo(() => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 border-t border-[#e3e6ee] px-2 py-3 min-[700px]:flex-row min-[700px]:items-center min-[700px]:justify-between">
      <Typo
        variant="body-sm"
        className="min-w-0 !text-[11px] !font-medium !text-[#60677c]"
      >
        Showing {total ? startIndex + 1 : 0} to{" "}
        {Math.min(startIndex + currentCount, total)} of {total} entries
      </Typo>

      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] border border-[#e2e5ee] bg-white text-[#49516b] transition hover:border-[#ffb396] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>

        {visiblePages[0] > 1 && (
          <>
            <PageBtn page={1} active={page === 1} onClick={onPageChange} />
            {visiblePages[0] > 2 && (
              <span className="px-0.5 text-[11px] font-bold text-[#60677c]">...</span>
            )}
          </>
        )}

        {visiblePages.map((p) => (
          <PageBtn key={p} page={p} active={page === p} onClick={onPageChange} />
        ))}

        {visiblePages[visiblePages.length - 1] < totalPages && (
          <>
            {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
              <span className="px-0.5 text-[11px] font-bold text-[#60677c]">...</span>
            )}
            <PageBtn
              page={totalPages}
              active={page === totalPages}
              onClick={onPageChange}
            />
          </>
        )}

        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] border border-[#e2e5ee] bg-white text-[#49516b] transition hover:border-[#ffb396] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-3 w-3" />
        </button>

        <select
          value={perPage}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-7 min-w-[80px] shrink-0 rounded-[6px] border border-[#e2e5ee] bg-white px-2 text-[11px] font-semibold text-[#49516b] outline-none transition hover:border-[#ffb396] focus:border-[#ff4b0b]"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} / pg
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PageBtn({ page, active, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(page)}
      className={cn(
        "h-7 min-w-7 shrink-0 rounded-[6px] border px-2 text-[11px] font-bold transition",
        active
          ? "border-[#ff4b0b] bg-[#ff4b0b] text-white"
          : "border-[#e2e5ee] bg-white text-[#49516b] hover:border-[#ffb396]"
      )}
    >
      {page}
    </button>
  );
}
