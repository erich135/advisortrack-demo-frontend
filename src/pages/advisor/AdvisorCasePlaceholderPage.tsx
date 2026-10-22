import { Link, useParams } from 'react-router-dom';
import { getAdvisorCase } from '../../api/advisorApi';
import { ApiError } from '../../api/apiClient';
import { formatDate } from '../../lib/format';
import { getPipelineStageLabel } from '../../lib/pipelineStages';
import { useAsync } from '../../lib/useAsync';

export default function AdvisorCasePlaceholderPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const { data, loading, error } = useAsync(
    () => getAdvisorCase(caseId ?? ''),
    [caseId],
  );

  return (
    <section className="advisor-case-placeholder" data-testid="advisor-case-placeholder">
      <p className="advisor-coming-soon-kicker">Case summary</p>
      {loading ? <p className="advisor-home-empty">Loading case…</p> : null}
      {error ? (
        <p className="advisor-home-error">
          {error instanceof ApiError && (error.status === 404 || error.code === 'NOT_FOUND')
            ? 'This case is not in your book.'
            : 'This case could not be opened.'}
        </p>
      ) : null}
      {data ? (
        <>
          <h2>{data.title || data.contactName}</h2>
          <p>
            {getPipelineStageLabel(data.currentStage)} · {data.status}
            {data.nextStepDate ? ` · Next step ${formatDate(data.nextStepDate)}` : ''}
          </p>
          <p>
            Full case editing and Pipeline remain a later phase. This page only confirms the case that belongs to
            your contact.
          </p>
          <Link className="advisor-home-link" to={`/advisor/contacts/${data.contactId}`}>
            Back to contact
          </Link>
        </>
      ) : null}
    </section>
  );
}
