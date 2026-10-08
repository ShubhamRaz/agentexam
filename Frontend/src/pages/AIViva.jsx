// ============================================
// AGENTEXAM — AI Viva Page (Backend-Connected)
// ============================================
import { useState, useRef, useEffect } from 'react';
import { Mic, Send, Bot, User, Sparkles, Play, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, Button, Badge, AIBadge, ProgressBar, ProgressCircle, Select, PageLoading } from '../components/ui';
import { startViva, submitVivaAnswer, endViva } from '../services/viva';
import { getSubjects } from '../services/academic';

export default function AIViva() {
  const [phase, setPhase] = useState('intro'); // intro | active | evaluation
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [config, setConfig] = useState({ subjectId: '', topic: '' });
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Session state from backend
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [evaluationResults, setEvaluationResults] = useState([]);
  const [sessionResult, setSessionResult] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Load subjects from backend
  useEffect(() => {
    getSubjects().then(data => {
      setSubjects(data || []);
      if (data && data.length > 0) {
        setConfig(c => ({ ...c, subjectId: data[0].id }));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleStartViva = async () => {
    setLoading(true);
    try {
      const vivaSession = await startViva({
        subjectId: config.subjectId,
        difficulty: 'MEDIUM'
      });
      setSession(vivaSession);
      const vivaQuestions = vivaSession.questions || [];
      setQuestions(vivaQuestions);
      setPhase('active');
      setEvaluationResults([]);

      // Welcome message
      setMessages([
        { id: 'v1', role: 'ai', text: `Welcome to the AI Viva! I'll ask you ${vivaQuestions.length} questions to evaluate your understanding. Let's begin.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ]);

      // First question
      if (vivaQuestions.length > 0) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: 'q-0', role: 'ai',
            text: `Question 1: ${vivaQuestions[0].question_text}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }]);
          setQuestionIndex(1);
        }, 1000);
      }
    } catch (err) {
      console.error("Failed to start viva", err);
      setMessages([{ id: 'err', role: 'ai', text: 'Failed to start viva session. Please try again.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      setPhase('active');
    } finally {
      setLoading(false);
    }
  };

  const sendAnswer = async () => {
    if (!input.trim() || !session || questionIndex === 0) return;

    const currentQuestion = questions[questionIndex - 1];
    if (!currentQuestion) return;

    const userMsg = { id: `u-${Date.now()}`, role: 'user', text: input, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Submit answer to backend
      const result = await submitVivaAnswer(session.id, currentQuestion.id, input);

      // Build feedback message from backend evaluation
      const marks = result.marks_obtained ?? result.evaluation?.marks_obtained;
      const maxMarks = currentQuestion.marks || 10;
      const feedback = result.feedback || result.evaluation?.feedback || 'Answer recorded.';

      const evalMsg = {
        id: `ai-eval-${Date.now()}`, role: 'ai',
        text: `${feedback}\n\nScore: ${marks !== undefined ? `${marks}/${maxMarks}` : 'Pending evaluation'}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        evaluation: marks !== undefined ? { score: marks, maxScore: maxMarks } : null,
      };
      setMessages(prev => [...prev, evalMsg]);
      setEvaluationResults(prev => [...prev, { question: currentQuestion.question_text, score: marks || 0, maxScore: maxMarks }]);
    } catch (err) {
      console.error("Failed to submit answer", err);
      setMessages(prev => [...prev, {
        id: `ai-eval-${Date.now()}`, role: 'ai',
        text: 'Answer saved. Evaluation will be available after session ends.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }

    setIsTyping(false);

    // Show next question or finish
    if (questionIndex < questions.length) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `q-${Date.now()}`, role: 'ai',
          text: `Question ${questionIndex + 1}: ${questions[questionIndex].question_text}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]);
        setQuestionIndex(prev => prev + 1);
      }, 1500);
    } else {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: 'final', role: 'ai',
          text: 'That concludes the viva session. Click "End & Evaluate" to see your complete results.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]);
      }, 1500);
    }
  };

  const handleEndViva = async () => {
    if (!session) {
      setPhase('evaluation');
      return;
    }
    try {
      const result = await endViva(session.id);
      setSessionResult(result);
    } catch (err) {
      console.error("Failed to end viva", err);
    }
    setPhase('evaluation');
  };

  if (loading) return <PageLoading />;

  // ---- Intro Screen ----
  if (phase === 'intro') {
    return (
      <div className="animate-fade-in-up" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Card>
          <Card.Body style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-xl)', background: 'var(--color-ai-light)', color: 'var(--color-ai)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)' }}>
              <Mic size={28} />
            </div>
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>AI Viva Voce</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>Practice viva questions with AI. Get instant evaluation and feedback.</p>
            <AIBadge>Powered by AI</AIBadge>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', marginTop: 'var(--space-8)', textAlign: 'left' }}>
              <Select
                label="Subject"
                options={subjects.map(s => ({ value: s.id, label: s.name }))}
                value={config.subjectId}
                onChange={e => setConfig({ ...config, subjectId: e.target.value })}
              />
            </div>

            <Button variant="primary" size="lg" onClick={handleStartViva} className="w-full" style={{ marginTop: 'var(--space-6)' }} disabled={!config.subjectId}>
              <Play size={18} /> Start Viva Session
            </Button>

            <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', textAlign: 'left' }}>
              <strong>How it works:</strong>
              <ul style={{ marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>• AI generates topic-related questions from your subject</li>
                <li>• Type your answer for each question</li>
                <li>• Get instant score and feedback</li>
                <li>• View full evaluation at the end</li>
              </ul>
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  }

  // ---- Evaluation Screen ----
  if (phase === 'evaluation') {
    const totalScore = evaluationResults.reduce((sum, r) => sum + r.score, 0);
    const totalMax = evaluationResults.reduce((sum, r) => sum + r.maxScore, 0);
    const overallScore = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

    const strengths = evaluationResults.filter(r => r.score >= r.maxScore * 0.7);
    const improvements = evaluationResults.filter(r => r.score < r.maxScore * 0.7);

    return (
      <div className="animate-fade-in-up" style={{ maxWidth: '700px', margin: '0 auto' }}>
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <Card.Body style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <CheckCircle2 size={48} color="var(--color-success)" style={{ marginBottom: 'var(--space-4)' }} />
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>Viva Completed!</h2>
            <ProgressCircle value={overallScore} size={120} strokeWidth={8} label="Score" />
          </Card.Body>
        </Card>

        <div className="grid-cols-2" style={{ marginBottom: 'var(--space-6)' }}>
          <Card>
            <Card.Header><h3 className="card-title">✅ Strong Answers ({strengths.length})</h3></Card.Header>
            <Card.Body>
              {strengths.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>Keep practicing to build strong answers.</p>
              ) : strengths.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  <CheckCircle2 size={16} color="var(--color-success)" style={{ flexShrink: 0, marginTop: '2px' }} /> {s.question}
                </div>
              ))}
            </Card.Body>
          </Card>
          <Card>
            <Card.Header><h3 className="card-title">📈 Areas to Improve ({improvements.length})</h3></Card.Header>
            <Card.Body>
              {improvements.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>Excellent! All answers were strong.</p>
              ) : improvements.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  <ArrowRight size={16} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: '2px' }} /> {s.question}
                </div>
              ))}
            </Card.Body>
          </Card>
        </div>

        {evaluationResults.length > 0 && (
          <Card style={{ marginBottom: 'var(--space-6)' }}>
            <Card.Header><h3 className="card-title">Question Scores</h3></Card.Header>
            <Card.Body>
              {evaluationResults.map((qs, i) => (
                <div key={i} style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: 'var(--text-sm)' }}>Q{i + 1}: {qs.question}</span>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{qs.score}/{qs.maxScore}</span>
                  </div>
                  <ProgressBar value={qs.score} max={qs.maxScore} size="sm" />
                </div>
              ))}
            </Card.Body>
          </Card>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)' }}>
          <Button variant="secondary" onClick={() => { setPhase('intro'); setMessages([]); setQuestionIndex(0); setSession(null); setQuestions([]); setEvaluationResults([]); setSessionResult(null); }}>Take Another Viva</Button>
          <Button variant="primary" onClick={() => window.location.href = '/performance'}>View Performance <ArrowRight size={16} /></Button>
        </div>
      </div>
    );
  }

  // ---- Active Viva Chat ----
  return (
    <div className="viva-container">
      {/* Header */}
      <div style={{ padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontWeight: 'var(--font-semibold)' }}>AI Viva — {subjects.find(s => s.id === config.subjectId)?.name || 'Viva'}</h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>Question {Math.min(questionIndex, questions.length)} of {questions.length}</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <ProgressBar value={questionIndex} max={questions.length} style={{ width: '120px' }} />
          <Button variant="secondary" size="sm" onClick={handleEndViva}>End & Evaluate</Button>
        </div>
      </div>

      {/* Messages */}
      <div className="viva-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`viva-message ${msg.role === 'ai' ? 'ai' : 'user'}`}>
            <div className="viva-message-avatar">
              {msg.role === 'ai' ? <Bot size={18} /> : <User size={18} />}
            </div>
            <div>
              <div className="viva-message-bubble">
                {msg.text}
              </div>
              {msg.evaluation && (
                <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)' }}>
                  <Badge variant={msg.evaluation.score >= msg.evaluation.maxScore * 0.7 ? 'success' : 'warning'}>
                    {msg.evaluation.score}/{msg.evaluation.maxScore}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="viva-message ai">
            <div className="viva-message-avatar"><Bot size={18} /></div>
            <div className="viva-typing">
              <div className="viva-typing-dot" />
              <div className="viva-typing-dot" />
              <div className="viva-typing-dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="viva-input-area">
        <div className="viva-input-wrapper">
          <textarea
            className="viva-input"
            placeholder="Type your answer..."
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={2}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAnswer(); } }}
          />
          <Button variant="primary" onClick={sendAnswer} disabled={!input.trim() || isTyping}>
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
