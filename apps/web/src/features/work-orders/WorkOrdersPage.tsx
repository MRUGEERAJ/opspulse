import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { WORK_ORDER_STATUSES } from "@opspulse/shared";
import type { WorkOrderStatus } from "@opspulse/shared";
import { Link, useSearchParams } from "react-router-dom";

import { ApiError } from "../../shared/api/api-client";
import { useAuth } from "../auth/AuthContext";
import { listWorkOrders } from "./work-orders.api";
import type { WorkOrder, WorkOrdersListMeta } from "./work-orders.types";

const PAGE_LIMIT = 10;

export function WorkOrdersPage() {
  const { authenticatedRequest, session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = toPositiveInt(searchParams.get("page"), 1);
  const status = toWorkOrderStatus(searchParams.get("status"));
  const query = searchParams.get("q")?.trim() ?? "";
  const [searchInput, setSearchInput] = useState(query);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [meta, setMeta] = useState<WorkOrdersListMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    let isActive = true;

    async function loadWorkOrders() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await listWorkOrders(authenticatedRequest, {
          page,
          limit: PAGE_LIMIT,
          status,
          q: query || undefined
        });

        if (isActive) {
          setOrders(result.data);
          setMeta(result.meta);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "Could not load work orders."
          );
          setOrders([]);
          setMeta(null);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadWorkOrders();

    return () => {
      isActive = false;
    };
  }, [authenticatedRequest, page, query, status]);

  const resultSummary = useMemo(() => {
    if (!meta) {
      return "Newest first";
    }

    return `${meta.total} result${meta.total === 1 ? "" : "s"} - newest first`;
  }, [meta]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateSearchParams({
      page: 1,
      status,
      q: searchInput.trim()
    });
  }

  function handleStatusChange(nextStatus: string) {
    updateSearchParams({
      page: 1,
      status: toWorkOrderStatus(nextStatus),
      q: query
    });
  }

  function handlePageChange(nextPage: number) {
    updateSearchParams({
      page: nextPage,
      status,
      q: query
    });
  }

  function updateSearchParams(input: {
    page: number;
    status?: WorkOrderStatus;
    q?: string;
  }) {
    const nextParams = new URLSearchParams();
    nextParams.set("page", String(input.page));

    if (input.status) {
      nextParams.set("status", input.status);
    }

    if (input.q) {
      nextParams.set("q", input.q);
    }

    setSearchParams(nextParams);
  }

  return (
    <>
      <section className="page-heading page-heading-actions">
        <div>
          <p className="eyebrow">Admin and manager workspace</p>
          <h2>Work Orders</h2>
          <p>
            Server-backed operational table with status filtering, exact UUID
            lookup, pagination, and stable newest-first ordering.
          </p>
        </div>

        {session?.user.role === "ADMIN" ? (
          <Link className="button button-primary" to="/work-orders/new">
            New work order
          </Link>
        ) : null}
      </section>

      <section className="toolbar-card" aria-label="Work order filters">
        <form className="search-form" onSubmit={handleSearchSubmit}>
          <label className="form-field">
            <span>Search title or UUID</span>
            <input
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="generator or 30000000-..."
              value={searchInput}
            />
          </label>
          <button className="button button-secondary" type="submit">
            Search
          </button>
        </form>

        <label className="form-field status-filter">
          <span>Status</span>
          <select
            onChange={(event) => handleStatusChange(event.target.value)}
            value={status ?? ""}
          >
            <option value="">All statuses</option>
            {WORK_ORDER_STATUSES.map((item) => (
              <option key={item} value={item}>
                {formatEnumLabel(item)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="table-meta">
        <span>{resultSummary}</span>
        {query || status ? (
          <button
            className="button-link"
            onClick={() =>
              updateSearchParams({
                page: 1
              })
            }
            type="button"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <section className="table-card" aria-live="polite">
        <div className="work-orders-table-row table-header" aria-hidden="true">
          <span>Work order</span>
          <span>Priority</span>
          <span>Status</span>
          <span>Due</span>
          <span />
        </div>

        {isLoading ? (
          <TableState message="Loading work orders..." />
        ) : errorMessage ? (
          <TableState tone="error" message={errorMessage} />
        ) : orders.length === 0 ? (
          <TableState message="No work orders match the current filters." />
        ) : (
          orders.map((order) => (
            <div className="work-orders-table-row" key={order.id}>
              <div className="table-title-cell">
                <strong>{order.title}</strong>
                <span>{formatReference(order.id)}</span>
                {order.siteAddress ? <small>{order.siteAddress}</small> : null}
              </div>
              <span className={`priority-pill priority-${order.priority.toLowerCase()}`}>
                {formatEnumLabel(order.priority)}
              </span>
              <span className={`status-pill status-${order.status.toLowerCase()}`}>
                {formatEnumLabel(order.status)}
              </span>
              <span>{formatDate(order.dueAt)}</span>
              <Link to={`/work-orders/${order.id}`}>View details</Link>
            </div>
          ))
        )}
      </section>

      <nav className="pagination-bar" aria-label="Work order pagination">
        <button
          className="button button-secondary"
          disabled={!meta?.hasPreviousPage || isLoading}
          onClick={() => handlePageChange(page - 1)}
          type="button"
        >
          Previous
        </button>
        <span>
          Page {meta?.page ?? page} of {Math.max(meta?.totalPages ?? 1, 1)}
        </span>
        <button
          className="button button-secondary"
          disabled={!meta?.hasNextPage || isLoading}
          onClick={() => handlePageChange(page + 1)}
          type="button"
        >
          Next
        </button>
      </nav>
    </>
  );
}

function TableState({
  message,
  tone
}: {
  message: string;
  tone?: "error";
}) {
  return (
    <div className={`table-state${tone === "error" ? " table-state-error" : ""}`}>
      {message}
    </div>
  );
}

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toWorkOrderStatus(value: string | null): WorkOrderStatus | undefined {
  return WORK_ORDER_STATUSES.includes(value as WorkOrderStatus)
    ? (value as WorkOrderStatus)
    : undefined;
}

function formatReference(id: string): string {
  return `WO-${id.slice(0, 8).toUpperCase()}`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
