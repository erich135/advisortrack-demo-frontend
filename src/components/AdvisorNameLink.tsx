import { Link } from 'react-router-dom';
import { advisorDetailsPath } from '../lib/pipelineReturnPath';

type AdvisorNameLinkProps = {
  advisorId: string | null | undefined;
  name: string;
  returnPath?: string | null;
};

/**
 * Interactive advisor name using existing table-link styling.
 * Navigates to the shared Advisor Details route. Missing ids stay plain text.
 */
export function AdvisorNameLink({ advisorId, name, returnPath }: AdvisorNameLinkProps) {
  const id = advisorId?.trim() ?? '';
  if (!id) return <>{name}</>;
  return (
    <Link to={advisorDetailsPath(id, returnPath)} className="table-link">
      {name}
    </Link>
  );
}
