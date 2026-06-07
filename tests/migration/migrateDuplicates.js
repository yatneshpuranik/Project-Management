import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../server/.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/practice_db';

const boardSchema = new mongoose.Schema({
  title: String,
  createdBy: mongoose.Schema.Types.ObjectId,
  members: [mongoose.Schema.Types.ObjectId]
});

const Board = mongoose.model('Board', boardSchema);

const runMigration = async () => {
  try {
    console.log('Connecting to database:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('Database Connected successfully');

    const boards = await Board.find({});
    console.log(`Found ${boards.length} workspaces to audit`);

    let updatedCount = 0;

    for (const board of boards) {
      if (!board.createdBy) continue;
      const ownerId = board.createdBy.toString();
      const originalLen = board.members.length;

      // Filter out owner and duplicates
      const unique = [];
      const seen = new Set();
      for (const m of board.members) {
        if (m) {
          const mStr = m.toString();
          if (mStr !== ownerId && !seen.has(mStr)) {
            seen.add(mStr);
            unique.push(m);
          }
        }
      }

      if (originalLen !== unique.length) {
        console.log(`Workspace "${board.title}": members list cleaned from ${originalLen} to ${unique.length}`);
        board.members = unique;
        await board.save();
        updatedCount++;
      }
    }

    console.log(`Migration finished. Updated ${updatedCount} workspaces.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

runMigration();
