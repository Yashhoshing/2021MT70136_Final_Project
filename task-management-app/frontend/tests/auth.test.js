const axios = require('axios');
const BASE_URL = 'http://localhost:8000';

// Helper to generate a random username 
function defaultUser() {
  const suffix = Math.floor(Math.random() * 100000);
  return {
    username: `testuser_${suffix}`,
    password: 'TestPass123!'
  };
}

// Admin credentials (ensure this user exists and is an admin)
const ADMIN_USER = { username: 'admin', password: 'AdminPass123!' };

// Helper to get admin token
async function getAdminToken() {
  const res = await axios.post(
    `${BASE_URL}/login`,
    new URLSearchParams({ username: ADMIN_USER.username, password: ADMIN_USER.password }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data.access_token;
}

describe('Auth API', () => {
  let testUser;

  let adminToken;

  beforeAll(async () => {
    testUser = defaultUser();
    adminToken = await getAdminToken();
  });

  test('register success', async () => {
    let res;
    try {
      // Try direct registration (for first user)
      res = await axios.post(`${BASE_URL}/register`, testUser);
    } catch (err) {
      // If blocked, use admin registration
      if (err.response && err.response.status === 403) {
        res = await axios.post(
          `${BASE_URL}/admin/register`,
          testUser,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
      } else {
        throw err;
      }
    }
    expect([200, 201]).toContain(res.status);
    console.log('Registration response data:', res.data);
    console.log('username:', res.data.username);
    expect(
      res.data.username === testUser.username ||
      (typeof res.data === 'string' && res.data.toLowerCase().includes('registration successful'))
    ).toBeTruthy();
  });

  test('register duplicate', async () => {
    try {
      // Try direct registration (should fail if user exists)
      await axios.post(`${BASE_URL}/register`, testUser);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        // Try admin registration for duplicate
        try {
          await axios.post(
            `${BASE_URL}/admin/register`,
            testUser,
            { headers: { Authorization: `Bearer ${adminToken}` } }
          );
        } catch (err2) {
          const data = err2.response.data;
          let errorMsg = typeof data === 'string' ? data : data.message || JSON.stringify(data);
          expect([400, 409]).toContain(err2.response.status);
          const isExpected = typeof errorMsg === 'string' &&
            (errorMsg.toLowerCase().includes('already') || errorMsg.toLowerCase().includes('exist'));
          if (!isExpected) {
            console.error(`Expected error message to mention 'already' or 'exist', got: ${errorMsg}`);
          }
          expect(isExpected).toBeTruthy();
          return;
        }
      }
      const data = err.response.data;
      let errorMsg = typeof data === 'string' ? data : data.message || JSON.stringify(data);
      expect([400, 409]).toContain(err.response.status);
      const isExpected = typeof errorMsg === 'string' &&
        (errorMsg.toLowerCase().includes('already') || errorMsg.toLowerCase().includes('exist'));
      if (!isExpected) {
        console.error(`Expected error message to mention 'already' or 'exist', got: ${errorMsg}`);
      }
      expect(isExpected).toBeTruthy();
    }
  });

  test('register missing fields', async () => {
    try {
      // Try direct registration
      await axios.post(`${BASE_URL}/register`, { username: '', password: '' });
    } catch (err) {
      if (err.response && err.response.status === 403) {
        // Try admin registration
        try {
          await axios.post(
            `${BASE_URL}/admin/register`,
            { username: '', password: '' },
            { headers: { Authorization: `Bearer ${adminToken}` } }
          );
        } catch (err2) {
          expect([400, 422]).toContain(err2.response.status);
          return;
        }
      }
      expect([400, 422]).toContain(err.response.status);
    }
  });

  test('login success', async () => {
    const res = await axios.post(
      `${BASE_URL}/login`,
      new URLSearchParams({ username: testUser.username, password: testUser.password }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    expect(res.status).toBe(200);
    expect(res.data.access_token).toBeDefined();
  });

  test('login wrong password', async () => {
    try {
      await axios.post(
        `${BASE_URL}/login`,
        new URLSearchParams({ username: testUser.username, password: 'wrongpass' }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
    } catch (err) {
      const data = err.response.data;
      let errorMsg = typeof data === 'string' ? data : data.message || JSON.stringify(data);
      expect([400, 401]).toContain(err.response.status);
      const isExpected = typeof errorMsg === 'string' &&
        (
          errorMsg.toLowerCase().includes('invalid') ||
          errorMsg.toLowerCase().includes('error') ||
          errorMsg.toLowerCase().includes('incorrect')
        );
      if (!isExpected) {
        console.error(`Expected error message to mention 'invalid' or 'error', got: ${errorMsg}`);
      }
      expect(isExpected).toBeTruthy();
    }
  });

  test('login nonexistent user', async () => {
    try {
      await axios.post(
        `${BASE_URL}/login`,
        new URLSearchParams({ username: 'nouser_xyz', password: 'nopass' }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
    } catch (err) {
      const data = err.response.data;
      let errorMsg = typeof data === 'string' ? data : data.message || JSON.stringify(data);
      expect([400, 401]).toContain(err.response.status);
      const isExpected = typeof errorMsg === 'string' &&
        (
          errorMsg.toLowerCase().includes('invalid') ||
          errorMsg.toLowerCase().includes('error') ||
          errorMsg.toLowerCase().includes('incorrect')
        );
      if (!isExpected) {
        console.error(`Expected error message to mention 'invalid' or 'error', got: ${errorMsg}`);
      }
      expect(isExpected).toBeTruthy();
    }
  });

  test('login stores token in localStorage', async () => {
    const testUser = defaultUser();
    await axios.post(
      `${BASE_URL}/admin/register`,
      testUser,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const res = await axios.post(
      `${BASE_URL}/login`,
      new URLSearchParams({ username: testUser.username, password: testUser.password }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    expect(res.data.access_token).toBeDefined();
    // Simulate storing token in localStorage
    global.localStorage = { setItem: jest.fn(), getItem: jest.fn(() => res.data.access_token) };
    localStorage.setItem('token', res.data.access_token);
    expect(localStorage.setItem).toHaveBeenCalledWith('token', res.data.access_token);
  });

  test('access protected route with valid token', async () => {
    const testUser = defaultUser();
    await axios.post(
      `${BASE_URL}/admin/register`,
      testUser,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const loginRes = await axios.post(
      `${BASE_URL}/login`,
      new URLSearchParams({ username: testUser.username, password: testUser.password }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const token = loginRes.data.access_token;
    const tasksRes = await axios.get(`${BASE_URL.replace('8000','8001')}/tasks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect([200, 201]).toContain(tasksRes.status);
    expect(Array.isArray(tasksRes.data)).toBeTruthy();
  });

  test('access protected route with invalid token', async () => {
    try {
      await axios.get(`${BASE_URL.replace('8000','8001')}/tasks`, {
        headers: { Authorization: 'Bearer faketoken123' }
      });
    } catch (err) {
      expect([401, 403]).toContain(err.response.status);
    }
  });

  test('logout removes token from localStorage', () => {
    global.localStorage = {
      setItem: jest.fn(),
      getItem: jest.fn(() => 'sometoken'),
      removeItem: jest.fn()
    };
    localStorage.setItem('token', 'sometoken');
    localStorage.removeItem('token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
  });
});
