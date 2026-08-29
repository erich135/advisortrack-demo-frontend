export type PipelineQueryState = {
  advisor: string;
  stage: string;
  status: string;
  search: string;
};

export const emptyPipelineQuery = (): PipelineQueryState => ({
  advisor: '',
  stage: '',
  status: '',
  search: '',
});

export const readPipelineQuery = (params: URLSearchParams): PipelineQueryState => ({
  advisor: params.get('advisor')?.trim() ?? '',
  stage: params.get('stage')?.trim() ?? '',
  status: params.get('status')?.trim() ?? '',
  search: params.get('search')?.trim() ?? '',
});

export const writePipelineQuery = (state: PipelineQueryState): URLSearchParams => {
  const params = new URLSearchParams();
  if (state.advisor) params.set('advisor', state.advisor);
  if (state.stage) params.set('stage', state.stage);
  if (state.status) params.set('status', state.status);
  if (state.search) params.set('search', state.search);
  return params;
};

export const teamPipelinePath = (state: PipelineQueryState): string => {
  const params = writePipelineQuery(state);
  const query = params.toString();
  return query ? `/team-pipeline?${query}` : '/team-pipeline';
};
