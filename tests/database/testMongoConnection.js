import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../../server/.env') });

const run = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('Error: MONGO_URI or MONGODB_URI is not defined in the environment.');
    process.exit(1);
  }

  // Parse MONGO_URI details
  let host = 'Unknown';
  let dbName = 'Unknown';
  let username = 'Unknown';
  let hasPassword = false;

  try {
    const protocolMatch = uri.match(/^mongodb(?:\+srv)?:\/\//);
    if (protocolMatch) {
      const withoutProtocol = uri.substring(protocolMatch[0].length);
      const atIdx = withoutProtocol.indexOf('@');
      if (atIdx !== -1) {
        const credentials = withoutProtocol.substring(0, atIdx);
        const colonIdx = credentials.indexOf(':');
        if (colonIdx !== -1) {
          username = credentials.substring(0, colonIdx);
          const password = credentials.substring(colonIdx + 1);
          hasPassword = password.length > 0;
        } else {
          username = credentials;
        }
      }
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connection successful!');

    console.log('--- Cluster Information ---');
    console.log('Connection Host:', mongoose.connection.host);
    console.log('Connection Port:', mongoose.connection.port);
    console.log('Database Name:', mongoose.connection.name);
    console.log('Username Extracted:', username);
    console.log('Has Password:', hasPassword ? 'Yes' : 'No');
    console.log('---------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('--- MongoDB Connection Failed ---');
    console.error('Exact connection error:', err.message || err);
    console.error('---------------------------------');
    process.exit(1);
  }
};

run();