import axios from 'axios';
const BASE_URL = 'http://localhost:8000';
const instance = axios.create({ baseURL: `${BASE_URL}/api`, timeout: 10000, headers: { 'Content-Type': 'application/json' }, withCredentials: true });

const run = async () => {
  try {
    const rand = Math.floor(Math.random()*100000);
    const payload = { name: `test${rand}`, email: `test${rand}@example.com`, password: 'TestPass123' };
    console.log('REGISTER', payload.email);
    const reg = await instance.post('/user/register', payload);
    console.log('REG_OK', reg.status, reg.data.message);
    const token = reg.data.token;
    const me = await instance.get('/user/me', { headers: { Authorization: `Bearer ${token}` } });
    console.log('ME', me.data.user.email, me.data.user.name);

    // Login with same creds
    const login = await instance.post('/user/login', { email: payload.email, password: payload.password });
    console.log('LOGIN_OK', login.status, login.data.message);

  } catch (err) {
    if (err.response) console.error('ERR_RESP', err.response.status, err.response.data);
    else console.error('ERR', err.message);
    process.exit(1);
  }
};
run();
