import type { FormEvent } from "react";
import { useState } from "react";
import { WORK_ORDER_PRIORITIES } from "@opspulse/shared";
import type { WorkOrderPriority } from "@opspulse/shared";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../../shared/api/api-client";
import { useAuth } from "../auth/AuthContext";
import { createWorkOrder } from "./work-orders.api";
import type { CreateWorkOrderRequest } from "./work-orders.types";

const DEFAULT_PRIORITY: WorkOrderPriority = "MEDIUM";

export function CreateWorkOrderPage() {
  const { authenticatedRequest, session } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] =
    useState<WorkOrderPriority>(DEFAULT_PRIORITY);
  const [dueAt, setDueAt] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [requiresProofPhoto, setRequiresProofPhoto] = useState(false);
  const [requiresLocation, setRequiresLocation] = useState(false);
  const [requiresQrScan, setRequiresQrScan] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const created = await createWorkOrder(authenticatedRequest, {
        title,
        description: nullableText(description),
        priority,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        siteAddress: nullableText(siteAddress),
        latitude: nullableNumber(latitude),
        longitude: nullableNumber(longitude),
        requiresProofPhoto,
        requiresLocation,
        requiresQrScan
      } satisfies CreateWorkOrderRequest);

      navigate(`/work-orders/${created.id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Could not create the work order."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (session?.user.role !== "ADMIN") {
    return (
      <>
        <Link className="back-link" to="/work-orders">
          Back to work orders
        </Link>
        <section className="content-card">
          <p className="eyebrow">Admin only</p>
          <h3>Create work order</h3>
          <p>Managers can assign work, but only Admins can create work orders.</p>
        </section>
      </>
    );
  }

  return (
    <>
      <Link className="back-link" to="/work-orders">
        Back to work orders
      </Link>

      <section className="page-heading">
        <p className="eyebrow">Admin workspace</p>
        <h2>Create Work Order</h2>
        <p>
          Create the operational job record that managers can assign and field
          agents can complete from mobile later.
        </p>
      </section>

      <form className="form-card work-order-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Title</span>
          <input
            maxLength={150}
            minLength={3}
            onChange={(event) => setTitle(event.target.value)}
            required
            value={title}
          />
        </label>

        <label className="form-field">
          <span>Description</span>
          <textarea
            maxLength={2000}
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </label>

        <div className="form-grid">
          <label className="form-field">
            <span>Priority</span>
            <select
              onChange={(event) =>
                setPriority(event.target.value as WorkOrderPriority)
              }
              value={priority}
            >
              {WORK_ORDER_PRIORITIES.map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Due date</span>
            <input
              onChange={(event) => setDueAt(event.target.value)}
              type="datetime-local"
              value={dueAt}
            />
          </label>
        </div>

        <label className="form-field">
          <span>Site address</span>
          <input
            maxLength={500}
            onChange={(event) => setSiteAddress(event.target.value)}
            value={siteAddress}
          />
        </label>

        <div className="form-grid">
          <label className="form-field">
            <span>Latitude</span>
            <input
              max="90"
              min="-90"
              onChange={(event) => setLatitude(event.target.value)}
              step="0.000001"
              type="number"
              value={latitude}
            />
          </label>

          <label className="form-field">
            <span>Longitude</span>
            <input
              max="180"
              min="-180"
              onChange={(event) => setLongitude(event.target.value)}
              step="0.000001"
              type="number"
              value={longitude}
            />
          </label>
        </div>

        <fieldset className="checklist-field">
          <legend>Field requirements</legend>
          <label>
            <input
              checked={requiresProofPhoto}
              onChange={(event) => setRequiresProofPhoto(event.target.checked)}
              type="checkbox"
            />
            Proof photo
          </label>
          <label>
            <input
              checked={requiresLocation}
              onChange={(event) => setRequiresLocation(event.target.checked)}
              type="checkbox"
            />
            Location capture
          </label>
          <label>
            <input
              checked={requiresQrScan}
              onChange={(event) => setRequiresQrScan(event.target.checked)}
              type="checkbox"
            />
            QR scan
          </label>
        </fieldset>

        {errorMessage ? (
          <div className="form-error" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <div className="form-actions">
          <Link className="button button-secondary" to="/work-orders">
            Cancel
          </Link>
          <button
            className="button button-primary"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Creating..." : "Create work order"}
          </button>
        </div>
      </form>
    </>
  );
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function nullableNumber(value: string): number | null {
  return value === "" ? null : Number(value);
}

function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
