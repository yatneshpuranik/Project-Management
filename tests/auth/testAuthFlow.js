import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.join(__dirname, '../../server/.env') });

const PORT = process.env.PORT || 8000;
const BASE_URL = `http://localhost:${PORT}`;
const TEST_EMAIL = 'authtest@example.com';
const TEST_NAME = 'Auth Test User';
const TEST_PASSWORD = 'password123';

const run = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
      console.error('Error: MONGO_URI or MONGODB_URI is not set in env.');
      process.exit(1);
    }

    console.log('Connecting to database for verification...');
    await mongoose.connect(uri);
    console.log('Connected to MongoDB successfully.');

    // 1. Verify Database: Check User collection exists
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('\n--- VERIFY DATABASE ---');
    console.log('Available collections:', collectionNames.join(', '));
    
    const userColExists = collectionNames.includes('users');
    console.log(`User collection ('users') exists: ${userColExists ? 'Yes' : 'No'}`);
    if (!userColExists) {
      throw new Error("User collection 'users' does not exist in the database!");
    }

    const usersCollection = db.collection('users');

    // 2. Count users
    const userCount = await usersCollection.countDocuments();
    console.log('Total users registered:', userCount);

    // 3. Print first 5 users
    const firstFiveUsers = await usersCollection.find().limit(5).toArray();
    console.log('First 5 users in database:');
    firstFiveUsers.forEach((user, idx) => {
      console.log(`  ${idx + 1}. Name: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
    });
    console.log('-----------------------');

    // 4. Register test user via API
    console.log('\n--- AUTH TESTS ---');
    console.log('Registering test user...');
    
    // Clean up if the user already exists from a failed previous test run
    await usersCollection.deleteOne({ email: TEST_EMAIL.toLowerCase().trim() });
    await usersCollection.deleteOne({ name: TEST_NAME });

    const registerRes = await fetch(`${BASE_URL}/api/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: TEST_NAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });

    console.log('Registration response status:', registerRes.status);
    const registerJson = await registerRes.json();
    console.log('Registration message:', registerJson.message);

    if (registerRes.status !== 201) {
      throw new Error(`Registration failed: ${registerJson.message}`);
    }

    // Verify hashing in database directly
    const createdUser = await usersCollection.findOne({ email: TEST_EMAIL });
    console.log('Test user found in MongoDB:', createdUser ? createdUser.email : 'No');
    const isHashed = createdUser && createdUser.password && createdUser.password.startsWith('$2a$');
    console.log('Password is hashed correctly:', isHashed ? 'Yes' : 'No');

    // 5. Attempt Login via API
    console.log('Attempting login...');
    const loginRes = await fetch(`${BASE_URL}/api/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });

    console.log('Login response status:', loginRes.status);
    const loginJson = loginRes.status === 200 ? await loginRes.json() : {};
    console.log('Login message:', loginJson.message || 'Failed');
    
    if (loginRes.status !== 200) {
      throw new Error(`Login failed: ${loginJson.message}`);
    }

    const token = loginJson.token;
    console.log('JWT generated:', token ? 'Yes' : 'No');

    // 6. Fetch profile via /api/user/me
    console.log('Fetching profile via /api/user/me...');
    const meRes = await fetch(`${BASE_URL}/api/user/me`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('/api/user/me status:', meRes.status);
    const meJson = await meRes.json();
    if (meRes.status === 200) {
      console.log('Fetched User Name:', meJson.user ? meJson.user.name : meJson.name);
      console.log('Fetched User Email:', meJson.user ? meJson.user.email : meJson.email);
    } else {
      console.error('Fetch profile failed:', meJson.message);
    }
    console.log('------------------');

    // Clean up
    console.log('Cleaning up test user...');
    await usersCollection.deleteOne({ email: TEST_EMAIL });
    console.log('Test user cleaned up.');
    console.log('All auth and database integration tests passed successfully!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n--- Auth Integration Test Failed ---');
    console.error('Exact error:', err.message || err);
    console.error('------------------------------------');
    // Attempt cleanup
    try {
      await mongoose.connection.db.collection('users').deleteOne({ email: TEST_EMAIL });
    } catch (e) {}
    try {
      await mongoose.disconnect();
    } catch (e) {}
    process.exit(1);
  }
};

run();