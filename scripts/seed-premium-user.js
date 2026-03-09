/**
 * Создаёт или обновляет пользователя с максимальной подпиской навсегда.
 * Запуск: node scripts/seed-premium-user.js
 * Требует: папка data/ и файл data/users.json (создаётся при первом запуске).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const SALT_LEN = 16;
const KEY_LEN = 64;
const ITERATIONS = 100000;
const DIGEST = 'sha512';

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LEN).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

const EMAIL = 'rusakvtl666@gmail.com';
const PASSWORD = ':B2Mh8ci.9r5qMg';
const NAME = 'Premium User';

function main() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let users = [];
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  }

  const lower = EMAIL.toLowerCase().trim();
  const hashed = hashPassword(PASSWORD);
  const now = new Date().toISOString();

  const index = users.findIndex((u) => (u.email || '').toLowerCase() === lower);
  const user = {
    id: index >= 0 ? users[index].id : `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    email: lower,
    name: NAME,
    password: hashed,
    plan: 'enterprise',
    subscriptionExpiresAt: null,
    createdAt: index >= 0 ? users[index].createdAt : now,
  };

  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  console.log('OK: пользователь', EMAIL, 'создан/обновлён с тарифом Enterprise навсегда.');
}

main();
