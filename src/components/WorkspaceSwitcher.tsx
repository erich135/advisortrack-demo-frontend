import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/useAuth';
import {
  defaultPathForWorkspace,
  eligibleWorkspaces,
  shouldShowWorkspaceSwitcher,
  workspaceFromPath,
  workspaceLabel,
  type WorkspaceId,
} from '../lib/workspace';

export function WorkspaceSwitcher({ environment = 'production' }: { environment?: 'production' | 'demo' }) {
  const { session } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  if (!shouldShowWorkspaceSwitcher(session)) return null;

  const eligible = eligibleWorkspaces(session);
  const current = workspaceFromPath(pathname, environment);

  return (
    <div className="workspace-switcher" data-testid="workspace-switcher">
      <span className="workspace-switcher-label">Workspace</span>
      <div className="workspace-switcher-options" role="tablist" aria-label="Switch workspace">
        {eligible.map((workspace) => (
          <button
            key={workspace}
            type="button"
            role="tab"
            aria-selected={current === workspace}
            className={`workspace-switcher-option${current === workspace ? ' is-active' : ''}`}
            onClick={() => {
              if (current === workspace) return;
              navigate(defaultPathForWorkspace(workspace as WorkspaceId));
            }}
          >
            {workspaceLabel(workspace)}
          </button>
        ))}
      </div>
    </div>
  );
}
