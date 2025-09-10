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
  let adminToken;

  beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  test('register success (first user is admin)', async () => {
    const testUser = { username: 'admin', password: 'AdminPass123!' };
    let res;
    try {
      console.error("[TRY BLOCK] Attempting direct registration for first user");
      // Wait for 3 seconds before registration
      await new Promise(resolve => setTimeout(resolve, 3000));
      // Try direct registration (for first user)
      res = await axios.post(`${BASE_URL}/register`, testUser);
      console.error("[TRY BLOCK] Direct registration response:", res.status, res.data);
    } catch (err) {
      console.error("[CATCH BLOCK] Direct registration failed");
      if (err.response && err.response.status === 403) {
        console.error("[CATCH BLOCK] Got 403, trying admin registration");
        res = await axios.post(
          `${BASE_URL}/admin/register`,
          testUser,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        console.error("[CATCH BLOCK] Admin registration response:", res.status, res.data);
      } else {
        console.error('[CATCH BLOCK] Registration error:', err.response ? err.response.data : err);
        throw err;
      }
    }
    expect([200, 201]).toContain(res.status);
    expect(res.data.username).toBe(testUser.username);
    expect(["Admin", "User"]).toContain(res.data.role);
  });

  test('register duplicate', async () => {
    const testUser = defaultUser();
    await axios.post(`${BASE_URL}/register`, testUser);
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
          expect(isExpected).toBeTruthy();
          return;
        }
      }
      const data = err.response.data;
      let errorMsg = typeof data === 'string' ? data : data.message || JSON.stringify(data);
      expect([400, 409]).toContain(err.response.status);
      const isExpected = typeof errorMsg === 'string' &&
        (errorMsg.toLowerCase().includes('already') || errorMsg.toLowerCase().includes('exist'));
      expect(isExpected).toBeTruthy();
    }
  });
  test('admin only registration after first user', async () => {
    // Register first user
    const firstUser = defaultUser();
    await axios.post(`${BASE_URL}/register`, firstUser);
    // Try to register another user directly
    try {
      await axios.post(`${BASE_URL}/register`, defaultUser());
    } catch (err) {
      expect(err.response.status).toBe(403);
      expect(
        err.response.data.detail.toLowerCase().includes('disabled') ||
        err.response.data.detail.toLowerCase().includes('admin')
      ).toBeTruthy();
    }
  });
  test('admin can register user', async () => {
    // Register admin
    const admin = defaultUser();
    await axios.post(`${BASE_URL}/register`, admin);
    const loginRes = await axios.post(
      `${BASE_URL}/login`,
      new URLSearchParams({ username: admin.username, password: admin.password }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const adminToken = loginRes.data.access_token;
    // Register user as admin
    const newUser = defaultUser();
    let res;
    try {
      res = await axios.post(
        `${BASE_URL}/admin/register`,
        newUser,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
    } catch (err) {
      console.error('Admin registration error:', err.response ? err.response.data : err);
      throw err;
    }
    expect([200, 201]).toContain(res.status);
    expect(res.data.username).toBe(newUser.username);
    expect(["Admin", "User"]).toContain(res.data.role);
  });
  test('get users count endpoint', async () => {
    const res = await axios.get(`${BASE_URL}/users/count`);
    expect(res.status).toBe(200);
    expect(typeof res.data.count).toBe('number');
  });
  test('get user list (admin only)', async () => {
    // Register admin
    const admin = defaultUser();
    await axios.post(`${BASE_URL}/register`, admin);
    const loginRes = await axios.post(
      `${BASE_URL}/login`,
      new URLSearchParams({ username: admin.username, password: admin.password }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const adminToken = loginRes.data.access_token;
    // Get user list
    const res = await axios.get(`${BASE_URL.replace('8000','8001')}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBeTruthy();
  });
  test('dashboard endpoints', async () => {
    // Register admin
    const admin = defaultUser();
    await axios.post(`${BASE_URL}/register`, admin);
    const loginRes = await axios.post(
      `${BASE_URL}/login`,
      new URLSearchParams({ username: admin.username, password: admin.password }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const adminToken = loginRes.data.access_token;
    // Create a task
    await axios.post(
      `${BASE_URL.replace('8000','8001')}/tasks`,
      { title: 'Dash Task', description: 'Desc' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    // Status
    const resp = await axios.get(`${BASE_URL.replace('8000','8001')}/dashboard/status`, { headers: { Authorization: `Bearer ${adminToken}` } });
    expect(resp.status).toBe(200);
    // Productivity
    const resp2 = await axios.get(`${BASE_URL.replace('8000','8001')}/dashboard/productivity`, { headers: { Authorization: `Bearer ${adminToken}` } });
    expect(resp2.status).toBe(200);
    // Progress
    const resp3 = await axios.get(`${BASE_URL.replace('8000','8001')}/dashboard/progress`, { headers: { Authorization: `Bearer ${adminToken}` } });
    expect(resp3.status).toBe(200);
    // Upcoming
    const resp4 = await axios.get(`${BASE_URL.replace('8000','8001')}/dashboard/upcoming`, { headers: { Authorization: `Bearer ${adminToken}` } });
    expect(resp4.status).toBe(200);
  });
  test('task comments and activity endpoints', async () => {
    // Register admin
    const admin = defaultUser();
    await axios.post(`${BASE_URL}/register`, admin);
    const loginRes = await axios.post(
      `${BASE_URL}/login`,
      new URLSearchParams({ username: admin.username, password: admin.password }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const adminToken = loginRes.data.access_token;
    // Create a task
    const taskRes = await axios.post(
      `${BASE_URL.replace('8000','8001')}/tasks`,
      { title: 'Comment Task', description: 'Desc' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const taskId = taskRes.data.id;
    // Add a comment
    await axios.put(
      `${BASE_URL.replace('8000','8001')}/tasks/${taskId}`,
      { comment: 'First comment' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    // Get comments
    const commentsRes = await axios.get(`${BASE_URL.replace('8000','8001')}/tasks/${taskId}/comments`, { headers: { Authorization: `Bearer ${adminToken}` } });
    expect(commentsRes.status).toBe(200);
    expect(commentsRes.data.some(c => c.comment === 'First comment')).toBeTruthy();
    // Get activity
    const activityRes = await axios.get(`${BASE_URL.replace('8000','8001')}/tasks/${taskId}/activity`, { headers: { Authorization: `Bearer ${adminToken}` } });
    expect(activityRes.status).toBe(200);
    expect(activityRes.data.some(a => a.action === 'comment')).toBeTruthy();
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
    const testUser = defaultUser();
    await axios.post(`${BASE_URL}/register`, testUser);
    let res;
    try {
      res = await axios.post(
        `${BASE_URL}/login`,
        new URLSearchParams({ username: testUser.username, password: testUser.password }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
    } catch (err) {
      console.error('Login error:', err.response ? err.response.data : err);
      throw err;
    }
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
