import axios from 'axios';

const BASE_URL = 'http://localhost:8000';
const instance = axios.create({ baseURL: `${BASE_URL}/api`, timeout: 10000, headers: { 'Content-Type': 'application/json' }, withCredentials: true });

const run = async () => {
  try {
    const login = await instance.post('/user/login', { email: 'testuser@example.com', password: 'TestPass123' });
    console.log('LOGIN_OK', login.status, login.data.message);
    const token = login.data.token;
    const me = await instance.get('/user/me', { headers: { Authorization: `Bearer ${token}` } });
    console.log('ME_OK', me.status, me.data.user.email, me.data.user.name);
  } catch (err) {
    if (err.response) {
      console.error('ERROR_RESPONSE', err.response.status, err.response.data);
    } else {
      console.error('ERROR', err.message);
    }
    process.exit(1);
  }
};

run();
