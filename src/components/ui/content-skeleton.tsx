export function ContentSkeleton({ kind = "cards" }: { kind?: "cards" | "detail" | "account" }) {
  return <div className={`content-skeleton skeleton-${kind}`} role="status" aria-label="Loading content">
    <span className="sr-only">Loading content…</span>
    <div aria-hidden="true" className="skeleton-visual">
      <div className="skeleton-block skeleton-heading" /><div className="skeleton-block skeleton-description" />
      <div className="skeleton-panels">{Array.from({ length: kind === "cards" ? 3 : 2 }, (_, index) => <div className="skeleton-panel" key={index}>{kind !== "account" && <div className="skeleton-block skeleton-image" />}<div className="skeleton-block skeleton-line" /><div className="skeleton-block skeleton-line skeleton-short" /></div>)}</div>
    </div>
  </div>;
}
