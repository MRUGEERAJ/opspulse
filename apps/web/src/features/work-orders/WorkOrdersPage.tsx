import { Link } from "react-router-dom";

const placeholderOrders = [
  {
    id: "demo-generator-inspection",
    title: "Inspect backup generator",
    priority: "HIGH",
    status: "CREATED"
  },
  {
    id: "demo-loading-bay-sensor",
    title: "Replace loading bay sensor",
    priority: "URGENT",
    status: "CREATED"
  }
] as const;

export function WorkOrdersPage() {
  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">Admin and manager workspace</p>
        <h2>Work Orders</h2>
        <p>
          Placeholder records prove the list and detail navigation. They are
          not loaded from the protected work-order API yet.
        </p>
      </section>

      <div className="table-card">
        <div className="table-row table-header" aria-hidden="true">
          <span>Work order</span>
          <span>Priority</span>
          <span>Status</span>
          <span />
        </div>
        {placeholderOrders.map((order) => (
          <div className="table-row" key={order.id}>
            <strong>{order.title}</strong>
            <span>{order.priority}</span>
            <span className="status-pill">{order.status}</span>
            <Link to={`/work-orders/${order.id}`}>View details</Link>
          </div>
        ))}
      </div>
    </>
  );
}
