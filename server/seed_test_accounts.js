import mongoose from 'mongoose';
import User from './model/userModel.js';
import bycrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = 'mongodb://127.0.0.1:27017/practice_db';

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to local MongoDB for seeding...');

    // 1. Seed Admin
    const adminEmail = 'yatnesh@admin.com';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      const hashedPassword = await bycrypt.hash('yatneshadmin', 10);
      admin = await User.create({
        name: 'Yatnesh Puranik',
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
      });
      console.log('Admin user seeded:', admin.email);
    } else {
      // Ensure role is ADMIN and credentials are correct
      const hashedPassword = await bycrypt.hash('yatneshadmin', 10);
      admin.name = 'Yatnesh Puranik';
      admin.role = 'ADMIN';
      admin.password = hashedPassword;
      await admin.save();
      console.log('Admin user reset and confirmed.');
    }

    // 2. Seed User
    const userEmail = 'yp@gmail.com';
    let user = await User.findOne({ email: userEmail });
    if (!user) {
      const hashedPassword = await bycrypt.hash('yatnesh', 10);
      user = await User.create({
        name: 'Yatnesh User',
        email: userEmail,
        password: hashedPassword,
        role: 'USER',
      });
      console.log('Standard user seeded:', user.email);
    } else {
      // Ensure role is USER and credentials are correct
      const hashedPassword = await bycrypt.hash('yatnesh', 10);
      user.name = 'Yatnesh User';
      user.role = 'USER';
      user.password = hashedPassword;
      await user.save();
      console.log('Standard user reset and confirmed.');
    }

    console.log('Seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
