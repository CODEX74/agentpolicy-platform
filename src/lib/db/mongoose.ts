import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null };

if (process.env.NODE_ENV !== 'production') {
  global.mongoose = cached;
}

async function dbConnect(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env.local'
    );
  }
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = { bufferCommands: true };
    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
    const c = cached.conn.connection as NodeJS.EventEmitter;
    if (typeof c?.setMaxListeners === 'function') c.setMaxListeners(20);
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

/** 1 = connected. Ждём готовности соединения. */
function waitConnected(mongooseInstance: typeof mongoose, ms: number): Promise<void> {
  if (mongooseInstance.connection.readyState === 1) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    mongooseInstance.connection.once('connected', () => {
      clearTimeout(t);
      resolve();
    });
  });
}

/** Подключение без выброса ошибки: при недоступности MongoDB возвращает null. */
export async function safeDbConnect(): Promise<typeof mongoose | null> {
  if (!MONGODB_URI) return null;
  if (cached.conn && cached.conn.connection.readyState === 1) return cached.conn;
  if (!cached.promise) {
    const opts = { bufferCommands: true };
    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }
  try {
    const conn = await Promise.race([
      cached.promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      ),
    ]);
    // Увеличиваем лимит до вызова waitConnected, чтобы не было MaxListenersExceededWarning при частых запросах
    const connection = conn.connection as NodeJS.EventEmitter;
    if (typeof connection?.setMaxListeners === 'function') connection.setMaxListeners(20);
    await waitConnected(conn, 2000);
    cached.conn = conn;
    return cached.conn;
  } catch {
    cached.promise = null;
    cached.conn = null;
    return null;
  }
}

export default dbConnect;
