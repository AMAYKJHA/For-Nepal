const AUTH_TOKEN_KEY = 'scholar_auth_token';
const USER_DATA_KEY = 'scholar_user_data';
const USER_ID_KEY = 'scholar_user_id';

const API_BASE = 'https://fornepal.onrender.com/api';

export function isLoggedIn() {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const user = localStorage.getItem(USER_DATA_KEY);
  return !!(token && user);
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    return null;
  }
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getUserId() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_ID_KEY);
}

// 🆕 Fetch user_id using credentials
async function fetchUserIdFromBackend(username, password) {
  console.log('🔍 Attempting to fetch user_id from backend...');
  
  // Method 1: Try Basic Auth with /users/me/ endpoint
  const basicAuthToken = 'Basic ' + btoa(`${username}:${password}`);
  
  const endpoints = [
    `${API_BASE}/auth/users/me/`,
    `${API_BASE}/auth/users/me`,
    `${API_BASE}/users/me/`,
    `${API_BASE}/users/me`,
    `${API_BASE}/auth/user/`,
  ];

  for (const url of endpoints) {
    try {
      console.log(`Trying: ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': basicAuthToken,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Got user data:', data);
        
        const userId = data.id || data.user_id || data.pk || data.userId;
        if (userId) {
          localStorage.setItem(USER_ID_KEY, String(userId));
          console.log('✅ Saved user_id:', userId);
          return userId;
        }
      }
    } catch (e) {
      console.log('❌ Failed:', url);
      continue;
    }
  }

  // Method 2: Try to fetch user list and find by username
  const listEndpoints = [
    `${API_BASE}/auth/users/`,
    `${API_BASE}/auth/users`,
    `${API_BASE}/users/`,
    `${API_BASE}/users`,
  ];

  for (const url of listEndpoints) {
    try {
      console.log(`Trying list endpoint: ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': basicAuthToken,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Got user list:', data);
        
        // Handle both array and paginated response
        const users = Array.isArray(data) ? data : (data.results || data.data || []);
        
        // Find user by username
        const user = users.find(u => u.username === username);
        if (user) {
          const userId = user.id || user.user_id || user.pk;
          if (userId) {
            localStorage.setItem(USER_ID_KEY, String(userId));
            console.log('✅ Found and saved user_id:', userId);
            return userId;
          }
        }
      }
    } catch (e) {
      console.log('❌ Failed list endpoint:', url);
      continue;
    }
  }

  // Method 3: Try token endpoints to get a real JWT
  const tokenEndpoints = [
    { url: `${API_BASE}/auth/token/login/`, body: { username, password } },
    { url: `${API_BASE}/auth/jwt/create/`, body: { username, password } },
    { url: `${API_BASE}/auth/login/`, body: { username, password } },
    { url: `${API_BASE}/token/`, body: { username, password } },
  ];

  for (const endpoint of tokenEndpoints) {
    try {
      console.log(`Trying token endpoint: ${endpoint.url}`);
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(endpoint.body),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Got token response:', data);
        
        // Extract token
        const token = data.token || data.access || data.accessToken || data.data?.token;
        if (token && token !== 'authenticated') {
          localStorage.setItem(AUTH_TOKEN_KEY, token);
          console.log('✅ Saved real token');
        }
        
        // Extract user_id
        const userId = data.user_id || data.id || data.user?.id || data.data?.user_id;
        if (userId) {
          localStorage.setItem(USER_ID_KEY, String(userId));
          console.log('✅ Saved user_id:', userId);
          return userId;
        }
        
        // If we got a JWT, decode it
        if (token && token.split('.').length === 3) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const decodedUserId = payload.user_id || payload.userId || payload.id || payload.sub;
            if (decodedUserId) {
              localStorage.setItem(USER_ID_KEY, String(decodedUserId));
              console.log('✅ Extracted user_id from JWT:', decodedUserId);
              return decodedUserId;
            }
          } catch (e) {
            console.log('JWT decode failed');
          }
        }
      }
    } catch (e) {
      console.log('❌ Failed token endpoint:', endpoint.url);
      continue;
    }
  }

  console.warn('⚠️ Could not fetch user_id from any endpoint');
  return null;
}

export async function login(credentials) {
  try {
    console.log('=== LOGIN START ===');
    
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    console.log('Login response:', data);

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Login failed');
    }

    let token = null;
    let user = null;
    let userId = null;

    // Extract from response
    if (data.token) token = data.token;
    else if (data.access) token = data.access;
    else if (data.accessToken) token = data.accessToken;
    else if (data.data?.token) token = data.data.token;

    if (data.user) user = data.user;
    else if (data.data?.user) user = data.data.user;
    else {
      user = {
        username: credentials.username,
        email: credentials.email || null,
      };
    }

    if (data.user_id) userId = data.user_id;
    else if (data.user?.id) userId = data.user.id;
    else if (data.id) userId = data.id;
    else if (data.pk) userId = data.pk;

    // Save user data
    if (user) {
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
    }

    // Save token if we got a real one
    if (token && token !== 'authenticated') {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }

    // Save user_id if we got it
    if (userId) {
      localStorage.setItem(USER_ID_KEY, String(userId));
      console.log('✅ Saved user_id from response:', userId);
    }

    // 🆕 If we don't have user_id, fetch it from backend
    if (!userId) {
      console.log('⚠️ user_id not in response, fetching from backend...');
      userId = await fetchUserIdFromBackend(credentials.username, credentials.password);
    }

    // Final fallback
    if (!token || token === 'authenticated') {
      localStorage.setItem(AUTH_TOKEN_KEY, 'authenticated');
      console.warn('⚠️ Using fallback token');
    }

    console.log('=== LOGIN END ===');
    console.log('Final state:', {
      token: localStorage.getItem(AUTH_TOKEN_KEY)?.substring(0, 20) + '...',
      userId: localStorage.getItem(USER_ID_KEY),
      user: localStorage.getItem(USER_DATA_KEY)
    });

    return { success: true, data, token, user, userId };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

export async function register(userData) {
  try {
    console.log('=== REGISTER START ===');
    
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    console.log('Register response:', data);

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Registration failed');
    }

    let token = null;
    let user = null;
    let userId = null;

    if (data.token) token = data.token;
    else if (data.access) token = data.access;
    else if (data.data?.token) token = data.data.token;

    if (data.user) user = data.user;
    else if (data.data?.user) user = data.data.user;
    else {
      user = {
        username: userData.username,
        email: userData.email || null,
      };
    }

    if (data.user_id) userId = data.user_id;
    else if (data.user?.id) userId = data.user.id;
    else if (data.id) userId = data.id;
    else if (data.pk) userId = data.pk;

    if (token && token !== 'authenticated') {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
    if (user) {
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
    }
    if (userId) {
      localStorage.setItem(USER_ID_KEY, String(userId));
      console.log('✅ Saved user_id:', userId);
    }

    // Fetch user_id if not in response
    if (!userId) {
      userId = await fetchUserIdFromBackend(userData.username, userData.password);
    }

    if (!token) {
      localStorage.setItem(AUTH_TOKEN_KEY, 'authenticated');
    }

    console.log('=== REGISTER END ===');
    return { success: true, data, token, user, userId };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: error.message };
  }
}

export function logout() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
  localStorage.removeItem(USER_ID_KEY);
  console.log('Logged out');
}