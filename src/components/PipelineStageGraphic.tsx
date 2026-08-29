import { PIPELINE_STAGES } from '../lib/pipelineStages';
import { pipelineProgressLabel, pipelineProgressStates } from '../lib/pipelineProgress';

export default function PipelineStageGraphic({ currentStage }: { currentStage: string }) {
  const states = pipelineProgressStates(currentStage);
  return (
    <div className="pipeline-graphic" role="img" aria-label={pipelineProgressLabel(currentStage)}>
      {PIPELINE_STAGES.map((stage, index) => (
        <span key={stage} className="pipeline-graphic-step">
          <span className={`pipeline-graphic-dot ${states[index]}`} />
          {index < PIPELINE_STAGES.length - 1 ? <span className="pipeline-graphic-line" /> : null}
        </span>
      ))}
    </div>
  );
}
