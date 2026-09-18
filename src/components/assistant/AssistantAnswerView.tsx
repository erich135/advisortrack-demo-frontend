import { useNavigate } from 'react-router-dom';
import type { AssistantAnswer } from '../../assistant/types';
import { Button } from '../ui';

export function AssistantAnswerView({
  answer,
  onNavigate,
  onSelectDisambiguation,
}: {
  answer: AssistantAnswer;
  onNavigate?: () => void;
  onSelectDisambiguation?: (cardId: string) => void;
}) {
  const navigate = useNavigate();

  function go(path: string) {
    navigate(path);
    onNavigate?.();
  }

  return (
    <div className="assistant-answer" data-testid="assistant-answer">
      <h3 className="assistant-answer-headline">{answer.headline}</h3>
      <p className="assistant-answer-body">{answer.body}</p>
      {answer.facts?.length ? (
        <dl className="assistant-answer-facts">
          {answer.facts.map((fact) => (
            <div key={`${fact.label}:${fact.value}`}>
              <dt>{fact.label}</dt>
              <dd>
                {fact.value}
                <span className="assistant-answer-fact-source">{fact.source}</span>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {answer.steps?.length ? (
        <ol className="assistant-answer-steps">
          {answer.steps.map((step, index) => (
            <li key={`${index}:${step.label}`}>
              {step.label}
              {step.action ? (
                <button
                  type="button"
                  className="assistant-inline-action"
                  onClick={() => go(step.action!.path)}
                >
                  {step.action.label}
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
      {answer.caveats?.length ? (
        <ul className="assistant-answer-caveats">
          {answer.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
      ) : null}
      {answer.actions?.length ? (
        <div className="assistant-answer-actions">
          {answer.actions.map((action) => (
            <Button key={action.routeId} type="button" size="sm" onClick={() => go(action.path)}>
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
      {answer.disambiguation?.length ? (
        <div className="assistant-suggestion-list" data-testid="assistant-disambiguation">
          {answer.disambiguation.map((item) => (
            <button
              key={item.cardId}
              type="button"
              className="assistant-suggestion"
              data-testid={`assistant-disambiguate-${item.cardId}`}
              onClick={() => onSelectDisambiguation?.(item.cardId)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      {answer.clarifyingQuestion ? (
        <p className="assistant-answer-clarify">{answer.clarifyingQuestion}</p>
      ) : null}
      {answer.escalation ? (
        <p className="assistant-answer-escalation">{answer.escalation.label}</p>
      ) : null}
      {answer.sources.length ? (
        <p className="assistant-answer-sources">
          Based on: {answer.sources.map((source) => source.title).join(', ')}
        </p>
      ) : null}
    </div>
  );
}
