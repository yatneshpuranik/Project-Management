import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { encryptId, decryptId, decryptIdIfNeeded } from '../../server/utils/idCrypt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log("JWT_SECRET from .env:", process.env.JWT_SECRET);

const mockId = '60d5ec49f83f2a3f8c8b4567';
const encrypted = encryptId(mockId);
console.log(`Encrypted Mock ID (${mockId}):`, encrypted);
console.log(`Decrypted Mock ID:`, decryptId(encrypted));

const problemHash = 'b2560a2afea163f39f6284609531d5d2ef9a1580f777442834cd28e3148a6b6c';
console.log(`Decrypted Problem Hash:`, decryptId(problemHash));
console.log(`Decrypted Needed:`, decryptIdIfNeeded(problemHash));
