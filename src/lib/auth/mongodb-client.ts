import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI ?? '';

// During build or if URI is malformed, avoid throwing — use a never-settling promise.
let clientPromise: Promise<import('mongodb').MongoClient>;
try {
  clientPromise = uri
    ? new MongoClient(uri).connect()
    : (new Promise(() => {}) as Promise<import('mongodb').MongoClient>);
} catch {
  clientPromise = new Promise(() => {}) as Promise<import('mongodb').MongoClient>;
}

export default clientPromise;
