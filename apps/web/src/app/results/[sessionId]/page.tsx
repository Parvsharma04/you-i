'use client';

import { useEffect, useState, useCallback, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toBlob } from 'html-to-image';
import { api, loadPlayerInfo } from '@/lib/api';
import { useSocket } from '@/lib/useSocket';
import type { Result, ResultStatusResponse } from '@youandi/shared';

export default function ResultsPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeoutReached, setTimeoutReached] = useState(false);
  
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  
  const captureRef = useRef<HTMLDivElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // For guarding generateResult
  const generationTriggered = useRef(false);
  const fetchingRef = useRef(false);

  useEffect(() => {
    const info = loadPlayerInfo(sessionId);
    if (info?.playerId) {
      setPlayerId(info.playerId);
    } else {
      setLoading(false); // Can't do anything without playerId
    }
  }, [sessionId]);

  const { on } = useSocket(sessionId, playerId);

  const applyResult = useCallback((data: Result) => {
    // Defensive parsing for LLM arrays in case they're malformed
    let parsedStrengths: string[] = [];
    let parsedDifferences: string[] = [];
    
    try {
      parsedStrengths = Array.isArray(data.strengths) ? data.strengths : JSON.parse(data.strengths as unknown as string);
    } catch {
      parsedStrengths = [];
    }
    
    try {
      parsedDifferences = Array.isArray(data.differences) ? data.differences : JSON.parse(data.differences as unknown as string);
    } catch {
      parsedDifferences = [];
    }
    
    setResult({
      ...data,
      strengths: Array.isArray(parsedStrengths) ? parsedStrengths : [],
      differences: Array.isArray(parsedDifferences) ? parsedDifferences : []
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!playerId || result) return;

    let mounted = true;
    let pollIntervalId: NodeJS.Timeout;
    const startTime = Date.now();
    let currentPollDelay = 3000;

    const checkResult = async () => {
      if (fetchingRef.current || !mounted) return;
      fetchingRef.current = true;
      
      try {
        let envelope = await api.getResult(sessionId);
        
        if (envelope.status === 'none') {
          if (!generationTriggered.current) {
            generationTriggered.current = true;
            envelope = await api.generateResult(sessionId);
          }
        }
        
        if (!mounted) return;

        if (envelope.status === 'ready' && envelope.data) {
          applyResult(envelope.data);
        } else if (envelope.status === 'pending' || envelope.status === 'none') {
          // Poll
          scheduleNextPoll();
        }
      } catch (err) {
        console.error('Failed to get result', err);
        scheduleNextPoll();
      } finally {
        fetchingRef.current = false;
      }
    };

    const scheduleNextPoll = () => {
      if (!mounted) return;
      
      const elapsed = Date.now() - startTime;
      if (elapsed > 90000) {
        setTimeoutReached(true);
        setLoading(false);
        return;
      }
      
      if (elapsed > 30000) {
        currentPollDelay = 10000;
      }
      
      pollIntervalId = setTimeout(checkResult, currentPollDelay);
    };

    checkResult();

    return () => {
      mounted = false;
      if (pollIntervalId) clearTimeout(pollIntervalId);
    };
  }, [playerId, sessionId, result, applyResult]);

  useEffect(() => {
    if (!result) {
      const cleanup = on('resultsReady', () => {
        if (!result && playerId) {
          api.getResult(sessionId).then(env => {
            if (env.status === 'ready' && env.data) applyResult(env.data);
          }).catch(console.error);
        }
      });
      return cleanup;
    }
  }, [on, result, playerId, sessionId, applyResult]);

  // Animate score counter
  useEffect(() => {
    if (result) {
      let current = 0;
      const target = result.score;
      const duration = 1500;
      const step = target / (duration / 16);

      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          current = target;
          clearInterval(timer);
          setTimeout(() => setShowContent(true), 300);
        }
        setAnimatedScore(Math.round(current));
      }, 16);

      return () => clearInterval(timer);
    }
  }, [result]);

  const shareLink = typeof window !== 'undefined'
    ? `${window.location.origin}/lobby/${sessionId}`
    : '';

  const handleCopy = useCallback(async () => {
    const shareText = result
      ? `YOU & I SCORE: ${result.score}%. PLAY: ${shareLink}`
      : shareLink;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result, shareLink]);

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `YOU & I SCORE: ${result?.score ?? '??'}%. \n\nPLAY NOW: ${shareLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleNewQuiz = () => {
    router.push('/');
  };

  const handleShareScreen = async () => {
    if (!shareCardRef.current) return;
    setSharingScreen(true);
    try {
      const blob = await toBlob(shareCardRef.current, {
        pixelRatio: 3,
        backgroundColor: '#fff0f5',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        }
      });
      
      if (!blob) throw new Error('Failed to generate image blob');

      const file = new File([blob], 'you-and-i-result.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'You & I Compatibility Result',
            text: `We got a ${result?.score}% match on You & I! Play: ${shareLink}`,
            files: [file],
          });
        } catch (e) {
          console.error('Sharing failed', e);
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'you-and-i-result.png';
        a.click();
        URL.revokeObjectURL(url);
      }
      setSharingScreen(false);
    } catch (error) {
      console.error('Error sharing screen:', error);
      setSharingScreen(false);
    }
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '★_★';
    if (score >= 75) return '^__^';
    if (score >= 60) return '-__-';
    if (score >= 40) return 'O_O';
    return 'X_X';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'S-RANK';
    if (score >= 75) return 'A-RANK';
    if (score >= 60) return 'B-RANK';
    if (score >= 40) return 'C-RANK';
    return 'F-RANK';
  };

  if (loading) {
    return (
      <main className="min-h-screen relative overflow-hidden">
        <div className="container-custom" style={{ justifyContent: 'center', alignItems: 'center', gap: '24px' }}>
          <div className="text-center flex flex-col items-center gap-5 p-10 animate-[fadeIn_0.6s_ease]">
            <div className="spinner" />
            <h3>ANALYZING...</h3>
            <p className="text-text-muted text-[0.95rem] font-medium italic">
              CALCULATING VIBES
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (timeoutReached && !result) {
    return (
      <main className="min-h-screen relative overflow-hidden">
        <div className="container-custom" style={{ justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '4rem' }}>O_O</span>
          <h2>THIS IS TAKING A WHILE</h2>
          <p style={{ color: 'var(--text-secondary)' }}>THE AI IS STILL THINKING.</p>
          <button className="btn-primary" onClick={() => {
            setLoading(true);
            setTimeoutReached(false);
            generationTriggered.current = false;
          }}>
            TRY AGAIN
          </button>
        </div>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="min-h-screen relative overflow-hidden">
        <div className="container-custom" style={{ justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '4rem' }}>X_X</span>
          <h2>DATA NOT FOUND</h2>
          <p style={{ color: 'var(--text-secondary)' }}>BOTH PLAYERS MUST FINISH.</p>
          <button className="btn-primary" onClick={() => router.push(`/quiz/${sessionId}`)}>
            BACK TO STAGE
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      <div ref={captureRef} className="container-custom" style={{ gap: '32px', paddingTop: '40px', paddingBottom: '60px' }}>
        {/* Score Section */}
        <div className="flex flex-col items-center gap-[18px] py-5 animate-[fadeInUp_0.8s_ease_forwards]">
          <span className="text-[3.5rem] animate-[bounceIn_0.8s_ease_0.3s_both]">{getScoreEmoji(result.score)}</span>

          <div className="score-circle">
            <span className="score-number">{animatedScore}</span>
          </div>

          <h2 className="text-[1.6rem] text-center font-display">
            <span className="text-gradient">{getScoreLabel(result.score)}</span>
          </h2>

          <p className="text-text-secondary text-base font-semibold">{result.score}% MATCH</p>
        </div>

        {/* AI Summary */}
        {showContent && (
          <>
            <div className="glass-card p-6 flex flex-col gap-4 opacity-0 animate-[fadeInUp_0.6s_ease_forwards] [animation-delay:0.1s]">
              <div className="flex items-center gap-2.5">
                <h3 className="text-[1.1rem] font-bold">SYSTEM ANALYSIS</h3>
              </div>
              <p className="text-text-secondary text-base leading-[1.7] font-medium">{result.summary}</p>
            </div>

            {/* Strengths */}
            {result.strengths && result.strengths.length > 0 && (
              <div className="glass-card p-6 flex flex-col gap-4 opacity-0 animate-[fadeInUp_0.6s_ease_forwards] [animation-delay:0.2s]">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-[1.1rem] font-bold">STRENGTHS</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.strengths.map((s, i) => (
                    <span key={i} className="tag strength">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Differences */}
            {result.differences && result.differences.length > 0 && (
              <div className="glass-card p-6 flex flex-col gap-4 opacity-0 animate-[fadeInUp_0.6s_ease_forwards] [animation-delay:0.3s]">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-[1.1rem] font-bold">WEAKNESSES</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.differences.map((d, i) => (
                    <span key={i} className="tag difference">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Share Section */}
            <div className="text-center flex flex-col items-center gap-4 animate-[fadeInUp_0.6s_ease_0.4s_both] ignore-screenshot">
              <h3 className="text-base font-bold text-text-secondary">SHARE RECORD:</h3>
              <div className="flex gap-3 flex-wrap justify-center">
                <button
                  id="copy-result-btn"
                  className="share-btn"
                  onClick={handleCopy}
                >
                  {copied ? 'COPIED' : 'COPY'}
                </button>
                <button
                  id="whatsapp-result-btn"
                  className="share-btn whatsapp"
                  onClick={handleShareWhatsApp}
                >
                  WHATSAPP
                </button>
                <button
                  id="screen-result-btn"
                  className="share-btn"
                  onClick={handleShareScreen}
                  disabled={sharingScreen}
                  style={{ background: '#ff1493', color: 'white', border: '2px solid #8b0000' }}
                >
                  {sharingScreen ? 'LOADING...' : 'SHARE IMAGE'}
                </button>
              </div>
            </div>

            {/* New Quiz CTA */}
            <button
              id="new-quiz-btn"
              className="btn-primary ignore-screenshot"
              onClick={handleNewQuiz}
              style={{ width: '100%', padding: '16px' }}
            >
              PLAY AGAIN
            </button>
          </>
        )}
      </div>

      {/* Hidden high-definition sharing card */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <div
          ref={shareCardRef}
          className="bg-[#fff0f5] font-body flex flex-col justify-between items-center text-text-primary"
          style={{
            width: '450px',
            height: '800px',
            padding: '60px 40px',
            boxSizing: 'border-box',
            backgroundImage: 'linear-gradient(var(--bg-secondary) 1px, transparent 1px), linear-gradient(90deg, var(--bg-secondary) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            border: '6px solid var(--border-color)',
          }}
        >
          {/* Brand */}
          <div className="flex flex-col items-center gap-2 text-center w-full">
            <div className="w-[60px] h-[60px] bg-bg-card flex items-center justify-center border-4 border-border-color shadow-[4px_4px_0px_var(--border-color)]">
              <span className="text-3xl font-display text-accent">&lt;3</span>
            </div>
            <h1 className="text-4xl text-accent font-display tracking-widest mt-2" style={{ textShadow: '2px 2px 0px var(--border-color)' }}>
              YOU &amp; I
            </h1>
            <p className="text-xs text-text-secondary font-bold tracking-wider uppercase">
              COMPATIBILITY OVERVIEW
            </p>
          </div>

          {/* Graphic Score */}
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">{getScoreEmoji(result.score)}</span>
            <div className="score-circle" style={{ width: '130px', height: '130px', boxShadow: '4px 4px 0px var(--border-color)', margin: '0 auto' }}>
              <span className="score-number text-5xl">{result.score}</span>
            </div>
            <h2 className="text-3xl text-accent font-display tracking-wide" style={{ textShadow: '2px 2px 0px var(--border-color)' }}>
              {getScoreLabel(result.score)}
            </h2>
            <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider">{result.score}% MATCH</p>
          </div>

          {/* Analysis Snippet */}
          <div className="glass-card p-4 flex flex-col gap-2 w-full max-h-[220px] overflow-hidden bg-bg-card text-left" style={{ borderWidth: '3px', boxShadow: '4px 4px 0px var(--border-color)' }}>
            <h3 className="text-base font-bold font-display text-text-primary">SYSTEM ANALYSIS</h3>
            <p className="text-text-secondary text-xs leading-relaxed font-medium" style={{ display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {result.summary}
            </p>
          </div>

          {/* Footer watermark */}
          <div className="text-center text-[10px] font-bold text-text-muted mt-2 tracking-wider">
            TEST YOUR COMPATIBILITY AT: <span className="text-accent">YOUANDI.PARVSHARMA.IN</span>
          </div>
        </div>
      </div>

      {/* Toast */}
      <div className={`toast ${copied ? 'show' : ''}`}>
        RECORD COPIED
      </div>
    </main>
  );
}
