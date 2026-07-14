import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiError } from "../../shared/api/api-client";
import { useAuth } from "../auth/AuthContext";
import {
  assignWorkOrder,
  getWorkOrder,
  listFieldAgents,
} from "./work-orders.api";
import type { FieldAgentSummary, WorkOrder } from "./work-orders.types";

const ASSIGNABLE_STATUSES = new Set(["CREATED", "ASSIGNED"]);

export function WorkOrderDetailPage() {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const { authenticatedRequest, session } = useAuth();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [fieldAgents, setFieldAgents] = useState<FieldAgentSummary[]>([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);
  const canAssign =
    session?.user.role === "ADMIN" || session?.user.role === "MANAGER";

  useEffect(() => {
    let isActive = true;

    async function loadDetail() {
      if (!workOrderId) {
        setErrorMessage("Work order id is missing.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      setAssignMessage(null);

      try {
        const [nextWorkOrder, nextFieldAgents] = await Promise.all([
          getWorkOrder(authenticatedRequest, workOrderId),
          canAssign
            ? listFieldAgents(authenticatedRequest)
            : Promise.resolve([]),
        ]);

        if (isActive) {
          setWorkOrder(nextWorkOrder);
          setFieldAgents(nextFieldAgents);
          setAssigneeId(
            nextWorkOrder.currentAssignment?.assigneeId ??
              nextFieldAgents[0]?.id ??
              "",
          );
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "Could not load the work order.",
          );
          setWorkOrder(null);
          setFieldAgents([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadDetail();

    return () => {
      isActive = false;
    };
  }, [authenticatedRequest, canAssign, workOrderId]);

  async function handleAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !workOrder ||
      !assigneeId ||
      workOrder.currentAssignment?.assigneeId === assigneeId
    ) {
      return;
    }

    setIsAssigning(true);
    setAssignMessage(null);

    try {
      const updated = await assignWorkOrder(
        authenticatedRequest,
        workOrder.id,
        assigneeId,
      );
      setWorkOrder(updated);
      setAssignMessage(
        workOrder.currentAssignment
          ? "Work order reassigned."
          : "Work order assigned.",
      );
    } catch (error) {
      setAssignMessage(
        error instanceof ApiError
          ? error.message
          : "Could not assign the work order.",
      );
    } finally {
      setIsAssigning(false);
    }
  }

  const isSameAssigneeSelected =
    Boolean(assigneeId) &&
    workOrder?.currentAssignment?.assigneeId === assigneeId;
  const canSubmitAssignment =
    Boolean(assigneeId) &&
    Boolean(workOrder && ASSIGNABLE_STATUSES.has(workOrder.status)) &&
    !isSameAssigneeSelected;
  const assignmentButtonLabel = isAssigning
    ? "Assigning..."
    : isSameAssigneeSelected
      ? "Assigned"
      : workOrder?.currentAssignment
        ? "Reassign"
        : "Assign";

  return (
    <>
      <Link className="back-link" to="/work-orders">
        Back to work orders
      </Link>

      {isLoading ? (
        <section className="content-card" aria-live="polite">
          <h3>Loading work order</h3>
          <p>Fetching the latest detail from the protected API.</p>
        </section>
      ) : errorMessage ? (
        <section className="content-card">
          <p className="eyebrow">Could not load</p>
          <h3>Work order unavailable</h3>
          <p>{errorMessage}</p>
        </section>
      ) : workOrder ? (
        <>
          <section className="page-heading page-heading-actions">
            <div>
              <p className="eyebrow">{formatReference(workOrder.id)}</p>
              <h2>{workOrder.title}</h2>
              <p>{workOrder.description ?? "No description provided."}</p>
            </div>
            <span
              className={`status-pill status-${workOrder.status.toLowerCase()}`}
            >
              {formatEnumLabel(workOrder.status)}
            </span>
          </section>

          {workOrder.status === "COMPLETED" ? (
            <section className="completion-notice" role="status">
              <h3>Job completed</h3>
              <p>The field agent has completed this work order.</p>
            </section>
          ) : null}

          <section className="detail-grid">
            <article className="content-card detail-card">
              <h3>Job details</h3>
              <dl className="detail-list">
                <div>
                  <dt>Priority</dt>
                  <dd>{formatEnumLabel(workOrder.priority)}</dd>
                </div>
                <div>
                  <dt>Due</dt>
                  <dd>{formatDate(workOrder.dueAt)}</dd>
                </div>
                <div>
                  <dt>Site</dt>
                  <dd>{workOrder.siteAddress ?? "Not provided"}</dd>
                </div>
                <div>
                  <dt>Coordinates</dt>
                  <dd>{formatCoordinates(workOrder)}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{formatDate(workOrder.createdAt)}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{formatDate(workOrder.updatedAt)}</dd>
                </div>
              </dl>
            </article>

            <article className="content-card detail-card">
              <h3>Field requirements</h3>
              <ul className="requirement-list">
                <li data-enabled={workOrder.requiresProofPhoto}>Proof photo</li>
                <li data-enabled={workOrder.requiresLocation}>
                  Location capture
                </li>
                <li data-enabled={workOrder.requiresQrScan}>QR scan</li>
              </ul>
            </article>
          </section>

          {canAssign ? (
            <section className="content-card assignment-card">
              <h3>Assign work order</h3>
              <div className="current-assignment">
                <span>Current assignment</span>
                {workOrder.currentAssignment ? (
                  <strong>
                    {workOrder.currentAssignment.assignee.name} (
                    {workOrder.currentAssignment.assignee.email})
                  </strong>
                ) : (
                  <strong>Unassigned</strong>
                )}
                {workOrder.currentAssignment ? (
                  <small>
                    Assigned {formatDate(workOrder.currentAssignment.assignedAt)}
                  </small>
                ) : null}
              </div>
              <form className="assignment-form" onSubmit={handleAssign}>
                <label className="form-field">
                  <span>FieldAgent</span>
                  <select
                    disabled={
                      fieldAgents.length === 0 ||
                      !ASSIGNABLE_STATUSES.has(workOrder.status)
                    }
                    onChange={(event) => setAssigneeId(event.target.value)}
                    value={assigneeId}
                  >
                    {fieldAgents.length === 0 ? (
                      <option value="">No active FieldAgents</option>
                    ) : (
                      fieldAgents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} ({agent.email})
                          {agent.id === workOrder.currentAssignment?.assigneeId
                            ? " - assigned"
                            : ""}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <button
                  className="button button-primary"
                  disabled={
                    isAssigning ||
                    !canSubmitAssignment
                  }
                  type="submit"
                >
                  {assignmentButtonLabel}
                </button>
              </form>
              {isSameAssigneeSelected ? (
                <p className="inline-note">
                  This FieldAgent is already assigned to this work order.
                </p>
              ) : null}
              {!ASSIGNABLE_STATUSES.has(workOrder.status) ? (
                <p className="inline-note">
                  This status cannot be reassigned through the current workflow.
                </p>
              ) : null}
              {assignMessage ? (
                <p className="inline-note" role="status">
                  {assignMessage}
                </p>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
    </>
  );
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
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCoordinates(workOrder: WorkOrder): string {
  if (workOrder.latitude === null || workOrder.longitude === null) {
    return "Not captured";
  }

  return `${workOrder.latitude}, ${workOrder.longitude}`;
}

function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
