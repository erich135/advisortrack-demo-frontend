import { PIPELINE_STAGES, getPipelineStageLabel, pipelineStageIndex } from './pipelineStages';

export type PipelineProgressState = 'complete' | 'current' | 'future';

export const pipelineProgressStates = (currentStage: string): PipelineProgressState[] => {
  const current = pipelineStageIndex(currentStage);
  return PIPELINE_STAGES.map((_, index) => {
    if (current < 0) return 'future';
    if (index < current) return 'complete';
    if (index === current) return 'current';
    return 'future';
  });
};

export const pipelineProgressLabel = (currentStage: string): string => {
  const current = pipelineStageIndex(currentStage);
  const label = getPipelineStageLabel(currentStage);
  if (current < 0) return `Current stage: ${label}`;
  return `Current stage: ${label}, stage ${current + 1} of ${PIPELINE_STAGES.length}`;
};
