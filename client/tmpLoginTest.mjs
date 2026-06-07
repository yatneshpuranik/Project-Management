import axios from 'axios';

const BASE_URL = process.env.VITE_SERVER_URL || 'http://localhost:8000';
const instance = axios.create({ baseURL: `${BASE_URL}/api`, timeout: 10000, headers: { 'Content-Type': 'application/json' }, withCredentials: true });

(async () => {
  try {
    const response = await instance.post('/user/login', { email: 'testuser@example.com', password: 'TestPass123' });
    console.log('SUCCESS', response.status, response.data);
  } catch (err) {
    if (err.response) {
      console.log('RESPONSE_ERROR', err.response.status, err.response.data);
    } else {
      console.log('REQUEST_ERROR', err.message);
    }
    process.exit(1);
  }
})();
