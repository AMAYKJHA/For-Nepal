import axios from 'axios';

// In Next.js, client-side environment variables must be prefixed with NEXT_PUBLIC_
const API_BASE = process.env.NEXT_PUBLIC_API_URL || ' https://192.168.101.249:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

export const chatAPI = {
  /**
   * @param {string} message
   * @param {Array}  conversationHistory  [{role, content}, ...]
   * @param {string|null} imageBase64     Optional base64 data URL
   */
  sendMessage: (message, conversationHistory = [], imageBase64 = null, model = null, tutorMode = false) =>
  api.post('/chat/', {
    message: message,
    conversation_history: conversationHistory,
    image_base64: imageBase64,   // keep null, NOT undefined
    model,
    tutor_mode: tutorMode,
  }),
};

export const memoryAPI = {
  getAll: (topic = null) => {
    const params = {};
    if (topic) params.topic = topic;
    return api.get('/memories/', { params });
  },
  delete: (id) =>
    api.delete('/memories/', { params: { id } }),
};

export const searchAPI = {
  search: (query) =>
    api.post('/search/', { query }),
};

export const flashcardAPI = {
  getAll: (subject = null) => {
    const params = {};
    if (subject) params.subject = subject;
    return api.get('/flashcards/', { params });
  },
  generate: (memoryId) => api.post('/summarize/', { memory_id: memoryId }),
  bulkGenerate: ({ subject } = {}) =>
    api.post('/flashcards/bulk/', subject ? { subject } : {}),
};

export const reviewAPI = {
  today: () => api.get('/reviews/today/'),
  submit: (flashcardId, difficulty) =>
    api.post('/reviews/submit/', { flashcard_id: flashcardId, difficulty }),
};

export const masteryAPI = {
  list: () => api.get('/mastery/'),
};

export const analyticsAPI = {
  learning: () => api.get('/analytics/learning/'),
};

export const adaptiveQuizAPI = {
  generate: (difficulty = 'intermediate') =>
    api.post('/quizzes/adaptive/generate/', { difficulty }),
};

export const conceptMapAPI = {
  generate: (payload = {}) => api.post('/concept-map/', payload),
};

export const topicAPI = {
  getTopics: () => api.get('/topics/'),
};

export const sessionAPI = {
  list:        ()         => api.get('/sessions/'),
  create:      (title)    => api.post('/sessions/', { title }),
  get:         (id)       => api.get(`/sessions/${id}/`),
  update:      (id, data) => api.patch(`/sessions/${id}/`, data),
  delete:      (id)       => api.delete(`/sessions/${id}/`),
  getMessages: (id)       => api.get(`/sessions/${id}/messages/`),
};

export const pdfAPI = {
  list:         ()                       => api.get('/pdf/'),
  upload:       (formData)               => api.post('/pdf/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  get:          (id)                     => api.get(`/pdf/${id}/`),
  remove:       (id)                     => api.delete(`/pdf/${id}/`),
  chat:         (id, message)            => api.post(`/pdf/${id}/chat/`, { message }),
  generateQuiz: (id, difficulty)         => api.post(`/pdf/${id}/quiz/generate/`, { difficulty }),
  getQuiz:      (id, difficulty)         => api.get(`/pdf/${id}/quiz/`, { params: { difficulty } }),
  submitQuiz:   (id, difficulty, answers)=> api.post(`/pdf/${id}/quiz/submit/`, { difficulty, answers }),
};