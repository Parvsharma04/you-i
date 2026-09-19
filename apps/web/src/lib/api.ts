const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export interface CreateSessionResponse {
  sessionId: string;
  playerId: string;
  code: string;
  questionIds: number[];
}

export interface JoinSessionResponse {
  sessionId: string;
  playerId: string;
  category: string;
  questionCount: number;
}

export interface SessionResponse {
  id: string;
  category: string;
  questionCount: number;
  status: string;
  code: string | null;
  createdAt: string;
}

export interface Question {
  id: number;
  text: string;
  type: string;
  options: string[] | null;
  category: string;
}

export interface AnswerCount {
  player1: number;
  player2: number;
  totalExpected: number;
  bothComplete: boolean;
}

export interface QuizResult {
  score: number;
  summary: string;
  strengths: string[];
  differences: string[];
}

export const api = {
  createSession: (category: string, questionCount: number) =>
    fetchAPI<CreateSessionResponse>('/session/create', {
      method: 'POST',
      body: JSON.stringify({ category, questionCount }),
    }),

  joinSession: (code: string) =>
    fetchAPI<JoinSessionResponse>('/session/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  getSession: (sessionId: string) =>
    fetchAPI<SessionResponse>(`/session/${sessionId}`),

  getQuestions: (sessionId: string) =>
    fetchAPI<Question[]>(`/question/${sessionId}`),

  submitAnswer: (sessionId: string, questionId: number, playerId: string, answer: string) =>
    fetchAPI('/answer', {
      method: 'POST',
      headers: { 'X-Player-Id': playerId },
      // playerId is also still sent in the body as a deprecated fallback —
      // remove once the API's ALLOW_LEGACY_PLAYER_ID_BODY flag is off.
      body: JSON.stringify({ sessionId, questionId, playerId, answer }),
    }),

  getAnswerCount: (sessionId: string) =>
    fetchAPI<AnswerCount>(`/answer/${sessionId}/count`),

  generateResult: (sessionId: string, playerId: string) =>
    fetchAPI<QuizResult>(`/result/generate/${sessionId}`, {
      method: 'POST',
      headers: { 'X-Player-Id': playerId },
    }),

  getResult: (sessionId: string, playerId: string) =>
    fetchAPI<QuizResult | null>(`/result/${sessionId}`, {
      headers: { 'X-Player-Id': playerId },
    }),
};
