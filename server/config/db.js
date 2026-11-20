import mongoose from 'mongoose'
import { env } from './env.js'

export async function connectDB(uri = env.MONGO_URI) {
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
  console.log(`✅ MongoDB connected (${mongoose.connection.host}/${mongoose.connection.name})`)
}
