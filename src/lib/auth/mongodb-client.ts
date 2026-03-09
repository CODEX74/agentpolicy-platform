import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI ?? '';

// During build, env may be missing — export a never-settling promise so imports don't throw.
const clientPromise = uri
  ? new MongoClient(uri).connect()
  : (new Promise(() => {}) as Promise<import('mongodb').MongoClient>);

export default clientPromise;
