import axios from 'axios';
const BASE_URL = 'http://localhost:8000';
const instance = axios.create({ baseURL: `${BASE_URL}/api`, timeout: 10000, headers: { 'Content-Type': 'application/json' }, withCredentials: true });
(async () => {
  try {
    const res = await instance.post('/user/login', { email: 'testuser@example.com', password: 'TestPass123' });
    console.log('STATUS', res.status);
    console.log('SET-COOKIE', res.headers['set-cookie'] || res.headers['Set-Cookie']);
    console.log('DATA', res.data.message);
  } catch (err) {
    if (err.response) console.error('RESP_ERR', err.response.status, err.response.data);
    else console.error('ERR', err.message);
  }
})();
