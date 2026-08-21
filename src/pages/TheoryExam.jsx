import React, { useState } from 'react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

const TheoryExam = () => {
  const [examState, setExamState] = useState('setup'); // setup, active, result
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const startExam = async () => {
    setLoading(true);
    const data = await api.startTheoryExam();
    setQuestions(data.questions);
    setExamState('active');
    setLoading(false);
  };

  const submitExam = async () => {
    setLoading(true);
    const resultData = await api.submitExam('ex_123', answers);
    setResult(resultData);
    setExamState('result');
    setLoading(false);
  };

  const handleAnswerChange = (val) => {
    setAnswers({ ...answers, [currentQuestionIndex]: val });
  };

  if (loading) {
    return <div className="p-8 text-center text-muted"><i className="fas fa-spinner fa-spin mr-2"></i>Processing...</div>;
  }

  if (examState === 'setup') {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-cog text-blue-600 mr-2"></i>Mock Test Setup</h4>
          </div>
          <div>
            <div className="p-4 bg-blue-100 text-blue-600 rounded-md flex items-start gap-3 mb-6">
              <i className="fas fa-exclamation-triangle mt-1 flex-shrink-0"></i>
              <div>
                <h4 className="font-bold text-sm">Instructions</h4>
                <p className="text-xs mt-1 leading-relaxed">This adaptive mock test contains MCQs, short answers, and long answers based on your Computer Networks syllabus. The difficulty will adapt based on your performance.</p>
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Subject</label>
              <select className="form-select" disabled>
                <option>Computer Networks</option>
              </select>
            </div>

            <div className="grid-2col" style={{ marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Question Count</label>
                <select className="form-select">
                  <option>20 Questions</option>
                  <option>40 Questions</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Time Limit</label>
                <select className="form-select">
                  <option>30 Minutes</option>
                  <option>60 Minutes</option>
                </select>
              </div>
            </div>

            <button className="btn btn-primary w-full mt-4" onClick={startExam}>
              <i className="fas fa-play"></i> Start Mock Test
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (examState === 'active') {
    const currentQ = questions[currentQuestionIndex];
    return (
      <div className="exam-interface max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg"><i className="fas fa-question-circle text-blue-600 mr-2"></i>Question {currentQuestionIndex + 1} of {questions.length}</h3>
          <span className="badge badge-warning text-sm px-4 py-2"><i className="far fa-clock mr-1"></i> Time Left: 28:45</span>
        </div>

        <div className="card mb-6">
          <div className="mb-4 flex justify-between">
            <span className="badge badge-secondary">{currentQ.topic}</span>
            <span className="badge badge-primary">{currentQ.type.toUpperCase()}</span>
          </div>
          <h4 className="text-lg font-medium mb-6 text-main leading-relaxed">{currentQ.text}</h4>

          {currentQ.type === 'mcq' && (
            <div className="flex flex-col gap-3">
              {currentQ.options.map((opt, idx) => (
                <label key={idx} className={`p-4 border rounded-md cursor-pointer flex items-center gap-3 transition-colors ${answers[currentQuestionIndex] === idx ? 'border-l-primary bg-blue-100 border-primary border-l-4' : 'border-light hover:bg-input'}`}>
                  <input 
                    type="radio" 
                    name={`q-${currentQuestionIndex}`} 
                    checked={answers[currentQuestionIndex] === idx}
                    onChange={() => handleAnswerChange(idx)}
                    className="w-4 h-4"
                  />
                  <span className="font-medium text-sm">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {(currentQ.type === 'short' || currentQ.type === 'long') && (
            <textarea 
              className="form-input min-h-[150px]"
              placeholder="Type your answer here..."
              value={answers[currentQuestionIndex] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
            />
          )}
        </div>

        <div className="flex justify-between">
          <button 
            className="btn btn-secondary" 
            disabled={currentQuestionIndex === 0}
            onClick={() => setCurrentQuestionIndex(i => i - 1)}
          >
            <i className="fas fa-chevron-left"></i> Previous
          </button>
          
          {currentQuestionIndex < questions.length - 1 ? (
            <button 
              className="btn btn-primary"
              onClick={() => setCurrentQuestionIndex(i => i + 1)}
            >
              Next Question <i className="fas fa-chevron-right"></i>
            </button>
          ) : (
            <button className="btn btn-success" onClick={submitExam}>
              <i className="fas fa-check-double"></i> Submit Exam
            </button>
          )}
        </div>
      </div>
    );
  }

  if (examState === 'result') {
    return (
      <div className="max-w-3xl mx-auto mt-8">
        <div className="card text-center mb-6 py-8">
          <i className="fas fa-check-circle text-6xl text-success mb-4"></i>
          <h2 className="text-2xl font-bold mb-2">Test Completed!</h2>
          <div className="text-5xl font-extrabold text-blue-600 mb-6">{result.score} <span className="text-2xl text-light">/ {result.totalMarks}</span></div>
          <p className="text-muted max-w-lg mx-auto bg-input p-4 rounded-md border border-light leading-relaxed">{result.feedback}</p>
        </div>

        <h3 className="font-bold text-lg mb-4"><i className="fas fa-search text-warning mr-2"></i>Areas for Improvement</h3>
        <div className="grid-2col">
          {result.weakTopics.map((topic, i) => (
            <div className="card flex items-center justify-between" key={i}>
              <span className="font-medium text-sm"><i className="fas fa-exclamation-circle text-danger mr-2"></i>{topic}</span>
              <button className="btn btn-outline-primary btn-sm">Review <i className="fas fa-arrow-right ml-1"></i></button>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <button className="btn btn-secondary" onClick={() => setExamState('setup')}><i className="fas fa-home"></i> Back to Exams</button>
        </div>
      </div>
    );
  }

  return null;
};

export default TheoryExam;
