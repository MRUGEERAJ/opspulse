import { ApiHealthCard } from "../../shared/components/ApiHealthCard";

const summaryCards = [
  { label: "Open work orders", value: "—", note: "API integration comes later" },
  { label: "Failed syncs", value: "—", note: "Sync module is deferred" },
  { label: "SLA breaches", value: "—", note: "SLA module is deferred" }
] as const;

export function DashboardPage() {
  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">Operations overview</p>
        <h2>Dashboard</h2>
        <p>
          The shell is ready for operational metrics without pretending that
          deferred backend modules already exist.
        </p>
      </section>

      <section className="summary-grid" aria-label="Operational summary placeholders">
        {summaryCards.map((card) => (
          <article className="summary-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.note}</small>
          </article>
        ))}
      </section>

      <ApiHealthCard />
    </>
  );
}
