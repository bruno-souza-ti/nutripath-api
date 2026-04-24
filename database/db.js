const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'nutripath.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL,
    objetivo TEXT DEFAULT '',
    criado_em TEXT NOT NULL
  )
`);

module.exports = db;