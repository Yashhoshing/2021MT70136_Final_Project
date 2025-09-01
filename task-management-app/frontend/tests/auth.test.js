
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

describe('Auth API', () => {
  let testUser;

  beforeAll(() => {
    testUser = defaultUser();
  });

  test('register success', async () => {
    const res = await axios.post(`${BASE_URL}/register`, testUser);
    expect([200, 201]).toContain(res.status);
    expect(
      res.data.username === testUser.username ||
      (typeof res.data === 'string' && res.data.toLowerCase().includes('registration successful'))
    ).toBeTruthy();
  });

  test('register duplicate', async () => {
    try {
      await axios.post(`${BASE_URL}/register`, testUser);
    } catch (err) {
      expect([400, 409]).toContain(err.response.status);
      expect(
        err.response.data.toLowerCase().includes('already') ||
        err.response.data.toLowerCase().includes('exist')
      ).toBeTruthy();
    }
  });

  test('register missing fields', async () => {
    try {
      await axios.post(`${BASE_URL}/register`, { username: '', password: '' });
    } catch (err) {
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
      expect([400, 401]).toContain(err.response.status);
      expect(
        (typeof err.response.data === 'string' && err.response.data.toLowerCase().includes('invalid')) ||
        (typeof err.response.data === 'string' && err.response.data.toLowerCase().includes('error'))
      ).toBeTruthy();
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
      expect([400, 401]).toContain(err.response.status);
      expect(
        (typeof err.response.data === 'string' && err.response.data.toLowerCase().includes('invalid')) ||
        (typeof err.response.data === 'string' && err.response.data.toLowerCase().includes('error'))
      ).toBeTruthy();
    }
  });
});
