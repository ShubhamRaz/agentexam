// ============================================
// AGENTEXAM — AI Viva Page
// ============================================
import { useState, useRef, useEffect } from 'react';
import { Mic, Send, Bot, User, Sparkles, Play, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, Button, Badge, AIBadge, ProgressBar, ProgressCircle, Select } from '../components/ui';
import { mockVivaSession, mockVivaEvaluation } from '../data/mockStudyPlan';
import { subjects } from '../data/mockSubjects';

export default function AIViva() {
  const [phase, setPhase] = useState('intro'); // intro | active | evaluation
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [config, setConfig] = useState({ subjectId: 'ds', topic: 'Trees and Graph Algorithms' });
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const startViva = () => {
    setPhase('active');
    setMessages([
      { id: 'v1', role: 'ai', text: `Welcome to the AI Viva on ${config.topic}! I'll ask you a series of questions to evaluate your understanding. Let's begin.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: 'v2', role: 'ai',
        text: mockVivaSession.vivaQuestions[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setQuestionIndex(1);
    }, 1500);
  };

  const sendAnswer = () => {
    if (!input.trim()) return;
    const userMsg = { id: `u-${Date.now()}`, role: 'user', text: input, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const score = Math.floor(Math.random() * 3) + 7;
      const evalMsg = {
        id: `ai-eval-${Date.now()}`, role: 'ai',
        text: `${score >= 8 ? 'Excellent answer!' : 'Good answer.'} ${score >= 8 ? 'Your explanation was thorough and accurate.' : 'You could add more detail about the time complexity aspects.'}\n\nScore: ${score}/10`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        evaluation: { score, maxScore: 10 },
      };
      setMessages(prev => [...prev, evalMsg]);
      setIsTyping(false);

      if (questionIndex < mockVivaSession.vivaQuestions.length) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: `q-${Date.now()}`, role: 'ai',
            text: `Question ${questionIndex + 1}: ${mockVivaSession.vivaQuestions[questionIndex]}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }]);
          setQuestionIndex(prev => prev + 1);
        }, 1500);
      } else {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: 'final', role: 'ai',
            text: 'That concludes the viva session. Click "View Evaluation" to see your complete results.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }]);
        }, 1500);
      }
    }, 2000);
  };

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
              <Select
                label="Topic"
                options={[
                  { value: 'Trees and Graph Algorithms', label: 'Trees and Graph Algorithms' },
                  { value: 'Sorting and Searching', label: 'Sorting and Searching' },
                  { value: 'Stacks and Queues', label: 'Stacks and Queues' },
                ]}
                value={config.topic}
                onChange={e => setConfig({ ...config, topic: e.target.value })}
              />
            </div>

            <Button variant="primary" size="lg" onClick={startViva} className="w-full" style={{ marginTop: 'var(--space-6)' }}>
              <Play size={18} /> Start Viva Session
            </Button>

            <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', textAlign: 'left' }}>
              <strong>How it works:</strong>
              <ul style={{ marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>• AI asks 8 topic-related questions</li>
                <li>• Type your answer for each question</li>
                <li>• Get instant score and feedback</li>
                <li>• AI may ask follow-up questions</li>
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
    const ev = mockVivaEvaluation;
    return (
      <div className="animate-fade-in-up" style={{ maxWidth: '700px', margin: '0 auto' }}>
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <Card.Body style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <CheckCircle2 size={48} color="var(--color-success)" style={{ marginBottom: 'var(--space-4)' }} />
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>Viva Completed!</h2>
            <ProgressCircle value={ev.overallScore} size={120} strokeWidth={8} label="Score" />
          </Card.Body>
        </Card>

        <div className="grid-cols-2" style={{ marginBottom: 'var(--space-6)' }}>
          <Card>
            <Card.Header><h3 className="card-title">✅ Strengths</h3></Card.Header>
            <Card.Body>
              {ev.strengths.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  <CheckCircle2 size={16} color="var(--color-success)" style={{ flexShrink: 0, marginTop: '2px' }} /> {s}
                </div>
              ))}
            </Card.Body>
          </Card>
          <Card>
            <Card.Header><h3 className="card-title">📈 Areas to Improve</h3></Card.Header>
            <Card.Body>
              {ev.improvements.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  <ArrowRight size={16} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: '2px' }} /> {s}
                </div>
              ))}
            </Card.Body>
          </Card>
        </div>

        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <Card.Header><h3 className="card-title">Question Scores</h3></Card.Header>
          <Card.Body>
            {ev.questionScores.map((qs, i) => (
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

        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)' }}>
          <Button variant="secondary" onClick={() => { setPhase('intro'); setMessages([]); setQuestionIndex(0); }}>Take Another Viva</Button>
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
          <h3 style={{ fontWeight: 'var(--font-semibold)' }}>AI Viva — {config.topic}</h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>Question {Math.min(questionIndex, mockVivaSession.vivaQuestions.length)} of {mockVivaSession.vivaQuestions.length}</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <ProgressBar value={questionIndex} max={mockVivaSession.vivaQuestions.length} style={{ width: '120px' }} />
          <Button variant="secondary" size="sm" onClick={() => setPhase('evaluation')}>End & Evaluate</Button>
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
                  <Badge variant={msg.evaluation.score >= 8 ? 'success' : 'warning'}>
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
