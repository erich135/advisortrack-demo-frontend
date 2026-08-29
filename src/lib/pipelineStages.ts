export const PIPELINE_STAGES = [
  'Initial Contact',
  'Interview',
  'Analysis',
  'Recommendation',
  'Implementation',
  'Review',
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  'Initial Contact': 'Initial contact',
  Interview: 'Fact-finding',
  Analysis: 'Analysis & quotes',
  Recommendation: 'Recommendation',
  Implementation: 'Implementation',
  Review: 'Review & servicing',
};

export const getPipelineStageLabel = (stage: string): string =>
  PIPELINE_STAGE_LABELS[stage as PipelineStage] ?? stage;

export const pipelineStageIndex = (stage: string): number => {
  const index = PIPELINE_STAGES.indexOf(stage as PipelineStage);
  return index >= 0 ? index : -1;
};
