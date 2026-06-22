import { Link, useParams } from "react-router-dom";

export function WorkOrderDetailPage() {
  const { workOrderId } = useParams<{ workOrderId: string }>();

  return (
    <>
      <Link className="back-link" to="/work-orders">
        ← Back to work orders
      </Link>
      <section className="page-heading">
        <p className="eyebrow">Placeholder detail route</p>
        <h2>Work Order Detail</h2>
        <p>
          Route parameter: <code>{workOrderId}</code>
        </p>
      </section>

      <article className="content-card">
        <h3>Integration boundary</h3>
        <p>
          Assignment history, proof photos, status history, location, QR scans,
          and audit logs will be connected when their backend modules exist.
        </p>
      </article>
    </>
  );
}
