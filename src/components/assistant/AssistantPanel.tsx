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
import {
  askAdvisorTrackAssistant,
  getAdvisorTrackAssistantConversation,
  resetAdvisorTrackAssistantConversation,
} from '../../api/assistantApi';
import { useAuth } from '../../lib/useAuth';
import {
  DEX_CLEARED_EVENT,
  clearDexTranscript,
  dexTranscriptStorageKey,
  readDexTranscript,
  writeDexTranscript,
} from '../../lib/dexConversationStorage';
import { answerFromCard, answerFromQuestion } from '../../assistant/cardToAnswer';
import {
  cardsForCurrentRoute,
  cardsForTopic,
  filterCardsForContext,
  liveQuestionsForRoute,
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
import { DEX_CTA, DEX_NAME, DEX_TAGLINE } from '../../assistant/dex';
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

function restoredAnswer(text: string): AssistantAnswer {
  return {
    answerId: nextId(),
    intent: 'conversation.restored',
    confidence: 1,
    mode: 'allowed',
    headline: text.slice(0, 80),
    body: text,
    sources: [],
  };
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
  const { session } = useAuth();
  const context = useAssistantContext(environment, bundle?.routes);
  const hydratedRef = useRef(false);
  const demoSessionId = (session as { demoSessionId?: string | null } | null)?.demoSessionId ?? null;
  const storageKey = dexTranscriptStorageKey({
    environment,
    userId: session?.user.id,
    companyId: session?.company?.id ?? session?.organisation?.id ?? null,
    demoSessionId,
  });

  useEffect(() => {
    function onCleared() {
      hydratedRef.current = true;
      setTranscript([]);
      setView('home');
      setTopic(null);
      setDraft('');
    }
    window.addEventListener(DEX_CLEARED_EVENT, onCleared);
    return () => window.removeEventListener(DEX_CLEARED_EVENT, onCleared);
  }, []);

  useEffect(() => {
    if (!session) {
      hydratedRef.current = false;
      setTranscript([]);
      setView('home');
      setTopic(null);
      return;
    }
    hydratedRef.current = false;
    const local = readDexTranscript(storageKey);
    if (local?.length) {
      setTranscript(local as TranscriptItem[]);
      hydratedRef.current = true;
      return;
    }
    let cancelled = false;
    void getAdvisorTrackAssistantConversation()
      .then((data) => {
        if (cancelled || !session || !data.turns?.length) return;
        setTranscript(
          data.turns.map((turn) =>
            turn.role === 'user'
              ? { id: nextId(), role: 'user' as const, text: turn.text }
              : { id: nextId(), role: 'assistant' as const, answer: restoredAnswer(turn.text) },
          ),
        );
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) hydratedRef.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [session, storageKey]);

  useEffect(() => {
    if (!session || !hydratedRef.current) return;
    writeDexTranscript(storageKey, transcript);
  }, [session, storageKey, transcript]);

  useEffect(() => {
    const onReset = () => {
      setTranscript([]);
      setView('home');
      setTopic(null);
    };
    window.addEventListener('advisortrack:demo-reset', onReset);
    return () => window.removeEventListener('advisortrack:demo-reset', onReset);
  }, []);

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
  const pageCards = useMemo(
    () => cardsForCurrentRoute(visibleCards, context.route.routeId),
    [visibleCards, context.route.routeId],
  );
  const liveQuestions = useMemo(
    () => liveQuestionsForRoute(context.route.routeId),
    [context.route.routeId],
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
    const previousUser = [...transcript].reverse().find((item) => item.role === 'user');
    const history = transcript
      .map((item) =>
        item.role === 'user'
          ? { role: 'user' as const, text: item.text.slice(0, 400) }
          : {
            role: 'assistant' as const,
            text: `${item.answer.headline}. ${item.answer.body}`.slice(0, 400),
          },
      )
      .slice(-12);
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
          previousQuestion: previousUser?.text,
          history,
          viewport: window.matchMedia('(max-width: 767px)').matches ? 'phone' : 'desktop',
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

  function startNewConversation() {
    hydratedRef.current = true;
    setTranscript([]);
    setView('home');
    setTopic(null);
    setDraft('');
    clearDexTranscript(storageKey);
    void resetAdvisorTrackAssistantConversation().catch(() => undefined);
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
          <h2 id="assistant-panel-title">{DEX_NAME}</h2>
          <p>{DEX_TAGLINE}</p>
        </div>
        <div className="assistant-panel-actions">
          {transcript.length > 0 ? (
            <button
              type="button"
              className="assistant-new-conversation"
              data-testid="assistant-new-conversation"
              onClick={startNewConversation}
            >
              New conversation
            </button>
          ) : null}
          <button
            type="button"
            className="assistant-icon-button"
            aria-label={`Close ${DEX_NAME}`}
            data-testid="assistant-close"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
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
              <p className="assistant-intro">Ask Dex anything — your book, or just talk.</p>
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
                    One moment…
                  </p>
                ) : null}
                <div ref={transcriptEndRef} data-testid="assistant-transcript-end" />
              </div>
            )}
            {liveQuestions.length > 0 || pageCards.length > 0 ? (
              <>
                <h3 className="assistant-section-label">On this page</h3>
                <div className="assistant-suggestion-list">
                  {liveQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      className="assistant-suggestion"
                      data-testid="assistant-live-question"
                      onClick={() => submitQuestion(question)}
                    >
                      {question}
                    </button>
                  ))}
                  {pageCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      className="assistant-suggestion"
                      data-testid={`assistant-page-card-${card.id}`}
                      onClick={() => pushCard(card, suggestionLabel(card))}
                    >
                      {suggestionLabel(card)}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
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
          {DEX_CTA}
        </label>
        <input
          id="assistant-input"
          ref={inputRef}
          className="assistant-input"
          placeholder={`${DEX_CTA}...`}
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
