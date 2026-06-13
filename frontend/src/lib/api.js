// src/lib/api.js

const API_BASE = 'https://fornepal.onrender.com/api'; // Update with your actual backend URL

function getUserId() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('scholar_user_id');
}

// ─── UPLOAD PDF AND GENERATE QUIZ ───────────────────────────────────────────
export async function uploadAndGenerateQuiz(file, title, instructions = '') {
  try {
    const userId = getUserId();

    console.log('📋 Upload prep:', { userId, fileName: file.name, title, instructions });

    if (!userId) {
      throw new Error('User ID not found. Please logout and login again.');
    }

    // Build FormData with all required fields
    const formData = new FormData();
    formData.append('file', file);
    formData.append('topic', title);           // ✅ Topic/Title
    formData.append('user_id', userId);
    
    // ✅ Add description/instructions if provided
    if (instructions && instructions.trim()) {
      formData.append('description', instructions.trim());
    }

    console.log('📤 Uploading to:', `${API_BASE}/game/topics/upload`);
    console.log('📋 FormData fields:', {
      file: file.name,
      topic: title,
      description: instructions || '(none)',
      user_id: userId
    });

    // Direct call to backend - NO custom headers = no CORS preflight
    const response = await fetch(`${API_BASE}/game/topics/upload`, {
      method: 'POST',
      body: formData,
    });

    const responseText = await response.text();
    console.log('📥 Response status:', response.status);
    console.log('📥 Response:', responseText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Invalid response: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok) {
      const errorMsg = data.message || data.error || data.detail || 
                       data.errors?.[0] || `Upload failed (${response.status})`;
      throw new Error(errorMsg);
    }

    return { 
      success: true, 
      data,
      topicId: data.id || data.topic_id || data.data?.id
    };
  } catch (error) {
    console.error('❌ Upload error:', error);
    return { success: false, error: error.message };
  }
}

// ─── GET USER TOPICS ────────────────────────────────────────────────────────
export async function getUserTopics() {
  try {
    const userId = getUserId();

    if (!userId) {
      throw new Error('User ID not found');
    }

    console.log('📋 Fetching topics for user:', userId);

    const response = await fetch(`${API_BASE}/game/users/${userId}/topics`, {
      method: 'GET',
    });

    const responseText = await response.text();
    console.log('📥 Topics response status:', response.status);
    console.log('📥 Topics response:', responseText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Invalid response: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok) {
      const errorMsg = data.message || data.error || data.detail || 
                       `Failed to fetch topics (${response.status})`;
      throw new Error(errorMsg);
    }

    return { 
      success: true, 
      data: Array.isArray(data) ? data : (data.topics || data.data || [])
    };
  } catch (error) {
    console.error('❌ Fetch topics error:', error);
    return { success: false, error: error.message, data: [] };
  }
}

// ─── GET/CREATE SESSION FOR A TOPIC ─────────────────────────────────────────
export async function getTopicSession(topicId) {
  try {
    const userId = getUserId();

    if (!userId) {
      throw new Error('User ID not found');
    }

    if (!topicId) {
      throw new Error('Topic ID not found');
    }

    console.log('📋 Getting session for topic:', topicId, 'user:', userId);

    const response = await fetch(
      `${API_BASE}/game/topics/${topicId}/session?user_id=${userId}`, 
      {
        method: 'GET',
      }
    );

    const responseText = await response.text();
    console.log('📥 Session response status:', response.status);
    console.log('📥 Session response:', responseText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Invalid response: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok) {
      const errorMsg = data.message || data.error || data.detail || 
                       `Failed to get session (${response.status})`;
      throw new Error(errorMsg);
    }

    return { success: true, data };
  } catch (error) {
    console.error('❌ Get session error:', error);
    return { success: false, error: error.message };
  }
}

// ─── UPDATE SESSION STATE ───────────────────────────────────────────────────
export async function updateSessionState(sessionId, stateData) {
  try {
    const userId = getUserId();

    if (!userId) {
      throw new Error('User ID not found');
    }

    if (!sessionId) {
      throw new Error('Session ID not found');
    }

    console.log('📋 Updating session state:', sessionId, stateData);

    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('state', JSON.stringify(stateData));

    const response = await fetch(
      `${API_BASE}/game/sessions/${sessionId}/state`, 
      {
        method: 'PATCH',
        body: formData,
      }
    );

    const responseText = await response.text();
    console.log('📥 Update session response status:', response.status);
    console.log('📥 Update session response:', responseText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Invalid response: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok) {
      const errorMsg = data.message || data.error || data.detail || 
                       `Failed to update session (${response.status})`;
      throw new Error(errorMsg);
    }

    return { success: true, data };
  } catch (error) {
    console.error('❌ Update session error:', error);
    return { success: false, error: error.message };
  }
}

// ─── SUBMIT QUIZ ANSWER ─────────────────────────────────────────────────────
export async function submitQuizAnswer(sessionId, questionIndex, answer, isCorrect) {
  try {
    const userId = getUserId();

    if (!userId || !sessionId) {
      throw new Error('Missing user_id or session_id');
    }

    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('question_index', String(questionIndex));
    formData.append('answer', String(answer));
    formData.append('correct', String(isCorrect));

    const response = await fetch(
      `${API_BASE}/game/sessions/${sessionId}/answer`, 
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || data.detail || `Failed to submit answer (${response.status})`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('❌ Submit answer error:', error);
    return { success: false, error: error.message };
  }
}

// ─── COMPLETE SESSION ───────────────────────────────────────────────────────
export async function completeSession(sessionId, score, totalQuestions, won) {
  try {
    const userId = getUserId();

    if (!userId || !sessionId) {
      throw new Error('Missing user_id or session_id');
    }

    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('state', JSON.stringify({
      completed: true,
      score,
      total_questions: totalQuestions,
      won,
      completed_at: new Date().toISOString(),
    }));

    const response = await fetch(
      `${API_BASE}/game/sessions/${sessionId}/state`, 
      {
        method: 'PATCH',
        body: formData,
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || data.detail || `Failed to complete session (${response.status})`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('❌ Complete session error:', error);
    return { success: false, error: error.message };
  }
}