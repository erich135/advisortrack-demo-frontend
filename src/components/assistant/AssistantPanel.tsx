import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, Send, X } from 'lucide-react';
import { askAdvisorTrackAssistant } from '../../api/assistantApi';
import { answerFromCard, answerFromQuestion } from '../../assistant/cardToAnswer';
import {
  cardsForTopic,
  filterCardsForContext,
  suggestionLabel,
  visibleHomeTopics,
} from '../../assistant/filter';
import { loadAssistantBundle } from '../../assistant/loadBundle';
import { useAssistantContext } from '../../assistant/useAssistantContext';
import type {
  AssistantAnswer,
  AssistantHomeTopic,
  FrontendKnowledgeBundle,
  FrontendKnowledgeCard,
} from '../../assistant/types';
import { AssistantAnswerView } from './AssistantAnswerView';
import { AssistantIcon } from './AssistantIcon';

type TranscriptItem =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; answer: AssistantAnswer };

type PanelView = 'home' | 'topic';

export type AssistantPanelProps = {
  environment: 'production' | 'demo';
  onClose: () => void;
};

let messageSeq = 0;
function nextId(): string {
  messageSeq += 1;
  return `m${messageSeq}`;
}

export default function AssistantPanel({ environment, onClose }: AssistantPanelProps) {
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(false);
  const [bundle, setBundle] = useState<FrontendKnowledgeBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [view, setView] = useState<PanelView>('home');
  const [topic, setTopic] = useState<AssistantHomeTopic | null>(null);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [asking, setAsking] = useState(false);
  const context = useAssistantContext(environment, bundle?.routes);

  function pinTranscriptToLatest() {
    shouldAutoScrollRef.current = true;
  }

  function scrollTranscriptToLatest() {
    const scroller = transcriptRef.current;
    if (!scroller) return;
    const end = transcriptEndRef.current;
    if (!end) {
      scroller.scrollTop = scroller.scrollHeight;
      return;
    }
    const nextTop =
      end.getBoundingClientRect().bottom -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop -
      scroller.clientHeight;
    scroller.scrollTop = Math.max(0, nextTop);
  }

  function onTranscriptScroll() {
    const scroller = transcriptRef.current;
    if (!scroller || asking) return;
    const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    if (distance > 80) shouldAutoScrollRef.current = false;
  }

  useEffect(() => {
    let cancelled = false;
    void loadAssistantBundle()
      .then((next) => {
        if (!cancelled) setBundle(next);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Unable to load AdvisorTrack help.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, [bundle, view]);

  useLayoutEffect(() => {
    if (view !== 'home' || !shouldAutoScrollRef.current) return;
    scrollTranscriptToLatest();
    const frame = window.requestAnimationFrame(() => {
      if (shouldAutoScrollRef.current) scrollTranscriptToLatest();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [transcript, asking, view]);

  const visibleCards = useMemo(
    () => (bundle ? filterCardsForContext(bundle, context) : []),
    [bundle, context],
  );
  const topics = useMemo(
    () => (bundle ? visibleHomeTopics(bundle.homeTopics, visibleCards, environment) : []),
    [bundle, visibleCards, environment],
  );
  const topicCards = useMemo(
    () => (topic ? cardsForTopic(visibleCards, topic) : []),
    [topic, visibleCards],
  );

  function pushCard(card: FrontendKnowledgeCard, spoken: string) {
    if (!bundle) return;
    pinTranscriptToLatest();
    setTranscript((current) => [
      ...current,
      { id: nextId(), role: 'user', text: spoken },
      { id: nextId(), role: 'assistant', answer: answerFromCard(bundle, card, context) },
    ]);
    setView('home');
    setTopic(null);
    setDraft('');
  }

  function chooseDisambiguation(cardId: string) {
    const card = visibleCards.find((item) => item.id === cardId);
    if (!card) return;
    pushCard(card, suggestionLabel(card));
  }

  function submitQuestion(text: string) {
    const spoken = text.trim();
    if (!spoken || !bundle || asking) return;
    pinTranscriptToLatest();
    const knowledge = bundle;
    const allowed = visibleCards;
    const assistantContext = context;
    setTranscript((current) => [...current, { id: nextId(), role: 'user', text: spoken }]);
    setView('home');
    setTopic(null);
    setDraft('');
    setAsking(true);
    void (async () => {
      let answer: AssistantAnswer;
      try {
        answer = await askAdvisorTrackAssistant({
          question: spoken,
          pathname: location.pathname,
          search: location.search,
        });
      } catch {
        answer = answerFromQuestion(knowledge, allowed, spoken, assistantContext);
      }
      setTranscript((current) => [...current, { id: nextId(), role: 'assistant', answer }]);
      setAsking(false);
    })();
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submitQuestion(draft);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  }

  return (
    <section
      id="assistant-panel"
      className="assistant-panel"
      role="dialog"
      aria-labelledby="assistant-panel-title"
      data-testid="assistant-panel"
    >
      <header className="assistant-panel-head">
        <AssistantIcon size={40} />
        <div>
          <h2 id="assistant-panel-title">AdvisorTrack Assistant</h2>
          <p>How can I help?</p>
        </div>
        <button
          type="button"
          className="assistant-icon-button"
          aria-label="Close AdvisorTrack Assistant"
          data-testid="assistant-close"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>

      <div
        className="assistant-panel-body"
        ref={transcriptRef}
        onScroll={onTranscriptScroll}
        data-testid="assistant-transcript-scroller"
      >
        {loadError ? <p className="assistant-load-error">{loadError}</p> : null}
        {!bundle && !loadError ? <p className="assistant-muted">Loading help…</p> : null}

        {view === 'home' ? (
          <>
            {transcript.length === 0 && !asking ? (
              <p className="assistant-intro">Ask me anything about using AdvisorTrack.</p>
            ) : (
              <div className="assistant-transcript" data-testid="assistant-transcript">
                {transcript.map((item) =>
                  item.role === 'user' ? (
                    <div key={item.id} className="assistant-bubble user">
                      {item.text}
                    </div>
                  ) : (
                    <div key={item.id} className="assistant-bubble assistant">
                      <AssistantAnswerView
                        answer={item.answer}
                        onNavigate={onClose}
                        onSelectDisambiguation={chooseDisambiguation}
                      />
                    </div>
                  ),
                )}
                {asking ? (
                  <p className="assistant-muted" data-testid="assistant-asking">
                    Looking that up…
                  </p>
                ) : null}
                <div ref={transcriptEndRef} data-testid="assistant-transcript-end" />
              </div>
            )}
            <h3 className="assistant-section-label">Popular topics</h3>
            <div className="assistant-topic-list">
              {topics.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="assistant-topic"
                  data-testid={`assistant-topic-${item.id}`}
                  onClick={() => {
                    setTopic(item);
                    setView('topic');
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div>
            <button
              type="button"
              className="assistant-back"
              onClick={() => {
                setView('home');
                setTopic(null);
              }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <h3 className="assistant-section-label">{topic?.label}</h3>
            <div className="assistant-suggestion-list">
              {topicCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className="assistant-suggestion"
                  data-testid={`assistant-card-${card.id}`}
                  onClick={() => pushCard(card, suggestionLabel(card))}
                >
                  {suggestionLabel(card)}
                </button>
              ))}
              {topicCards.length === 0 ? (
                <p className="assistant-muted">No help articles in this topic for your access.</p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <form className="assistant-composer" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="assistant-input">
          Ask AdvisorTrack
        </label>
        <input
          id="assistant-input"
          ref={inputRef}
          className="assistant-input"
          placeholder="Ask AdvisorTrack anything..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onInputKeyDown}
          autoComplete="off"
          data-testid="assistant-input"
        />
        <button
          type="submit"
          className="assistant-send"
          aria-label="Send question"
          disabled={!draft.trim() || asking}
        >
          <Send size={16} />
        </button>
      </form>
    </section>
  );
}
