import mongoose from 'mongoose'

/**
 * Connect to MongoDB
 */
const connectDb = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI
  if (!uri) {
    throw new Error('Missing MONGO_URI or MONGODB_URI environment variable')
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    })
    const dbName = mongoose.connection?.name || mongoose.connection?.db?.databaseName || 'unknown'
    console.log('MongoDB Connected')
    console.log(`Database: ${dbName}`)
    return
  } catch (err) {
    console.error('MongoDB connection failed:', err.message)
    const uriHost = uri.includes('@') ? uri.split('@')[1].split('/')[0] : uri.split('/')[2]
    const uriDb = uri.split('/').pop().split('?')[0]
    console.error('MongoDB host:', uriHost)
    console.error('MongoDB database:', uriDb)
    throw err
  }
}

export default connectDb