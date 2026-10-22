import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listAdvisorCases, type AdvisorCaseListItem } from '../../api/advisorApi';
import { formatZAR } from '../../lib/format';
import { getPipelineStageLabel, PIPELINE_STAGES, type PipelineStage } from '../../lib/pipelineStages';
import { caseErrorMessage, pipelineSummary, stageHint } from './caseWorkflow';

type StageFilter = 'all' | PipelineStage;

function CaseCard({ item }: { item: AdvisorCaseListItem }) {
  return (
    <Link className="advisor-pipeline-card" to={`/advisor/cases/${item.id}`} data-testid={`advisor-pipeline-card-${item.id}`}>
      <strong>{item.contactName || item.title || 'Case'}</strong>
      <span>{item.estimatedCommission ? formatZAR(item.estimatedCommission) : 'No estimated commission'}</span>
      <span>{stageHint(item)}</span>
      {item.status !== 'open' ? <em>{item.status}</em> : null}
    </Link>
  );
}

export default function AdvisorPipelinePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AdvisorCaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<StageFilter>('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void listAdvisorCases()
      .then((next) => {
        if (!cancelled) setItems(next);
      })
      .catch((caught) => {
        if (!cancelled) setError(caseErrorMessage(caught, 'Your pipeline could not be loaded.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => pipelineSummary(items), [items]);
  const visible = useMemo(
    () => (stage === 'all' ? items : items.filter((item) => item.currentStage === stage)),
    [items, stage],
  );

  return (
    <div className="advisor-pipeline" data-testid="advisor-pipeline">
      <header className="advisor-pipeline-head">
        <div>
          <p className="advisor-coming-soon-kicker">My Pipeline</p>
          <h2>Your cases</h2>
          <p className="advisor-home-muted">Your own book. This is not Team Pipeline.</p>
        </div>
        <dl className="advisor-pipeline-stats">
          <div>
            <dt>Open cases</dt>
            <dd>{loading ? '—' : summary.open}</dd>
          </div>
          <div>
            <dt>Estimated commission</dt>
            <dd>{loading ? '—' : formatZAR(summary.commission)}</dd>
          </div>
        </dl>
      </header>

      {loading ? <p className="advisor-home-empty">Loading your pipeline…</p> : null}
      {error ? <p className="advisor-home-error">{error}</p> : null}

      {!loading && !error ? (
        <>
          <div className="advisor-pipeline-toolbar" data-testid="advisor-pipeline-stage-filter">
            <label>
              Stage
              <select value={stage} onChange={(event) => setStage(event.target.value as StageFilter)}>
                <option value="all">All stages</option>
                {PIPELINE_STAGES.map((item) => (
                  <option key={item} value={item}>
                    {getPipelineStageLabel(item)} ({summary.stages[item]})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="advisor-pipeline-board" data-testid="advisor-pipeline-board">
            {PIPELINE_STAGES.map((column) => {
              const columnItems = items.filter((item) => item.currentStage === column);
              return (
                <section key={column} className="advisor-pipeline-column">
                  <h3>
                    {getPipelineStageLabel(column)}
                    <span>{columnItems.filter((item) => item.status === 'open').length}</span>
                  </h3>
                  {columnItems.length ? (
                    columnItems.map((item) => <CaseCard key={item.id} item={item} />)
                  ) : (
                    <p className="advisor-pipeline-empty">No cases</p>
                  )}
                </section>
              );
            })}
          </div>

          <div className="advisor-pipeline-list" data-testid="advisor-pipeline-list">
            {visible.length ? (
              visible.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="advisor-pipeline-row"
                  onClick={() => navigate(`/advisor/cases/${item.id}`)}
                >
                  <strong>{item.contactName || item.title || 'Case'}</strong>
                  <span>
                    {getPipelineStageLabel(item.currentStage)} · {item.status}
                    {item.estimatedCommission ? ` · ${formatZAR(item.estimatedCommission)}` : ''}
                  </span>
                  <span>{stageHint(item)}</span>
                </button>
              ))
            ) : (
              <p className="advisor-home-empty">No cases in this stage yet.</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
