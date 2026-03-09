// Скрипт для создания индексов в MongoDB
// Запуск: node scripts/init-db.js (с установленным MONGODB_URI в окружении)

const { MongoClient } = require('mongodb');

async function initDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME || 'agentpolicy');

    await db.collection('users').createIndex({ email: 1 }, { unique: true });

    await db.collection('agents').createIndex({ userId: 1 });
    await db.collection('agents').createIndex({ moltbookId: 1 }, { sparse: true });

    await db.collection('wallets').createIndex({ userId: 1 });
    await db.collection('wallets').createIndex({ agentId: 1 }, { sparse: true });
    await db.collection('wallets').createIndex({ address: 1 }, { unique: true });

    await db.collection('policies').createIndex({ userId: 1 });
    await db.collection('policies').createIndex({ agentId: 1 }, { unique: true });

    await db.collection('transactions').createIndex({ userId: 1 });
    await db.collection('transactions').createIndex({ agentId: 1 });
    await db.collection('transactions').createIndex({ walletId: 1 });
    await db.collection('transactions').createIndex({ createdAt: -1 });

    console.log('Database indexes created successfully');
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

initDatabase();
