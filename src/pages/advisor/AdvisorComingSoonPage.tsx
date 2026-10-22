export function AdvisorComingSoonPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="advisor-coming-soon" data-testid="advisor-coming-soon">
      <p className="advisor-coming-soon-kicker">Coming in the next phase</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}
