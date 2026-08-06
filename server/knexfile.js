// Local dev runs on SQLite so the app boots with zero external services.
// Production targets MySQL (cPanel-style hosting) — swap DB_CLIENT in .env.
// Migrations avoid MySQL-only syntax so the same files work against both.
import 'dotenv/config';

const client = process.env.DB_CLIENT || 'sqlite3';

const config = {
  sqlite3: {
    client: 'sqlite3',
    connection: { filename: process.env.SQLITE_PATH || './educore.sqlite3' },
    useNullAsDefault: true,
    migrations: { directory: './src/db/migrations' },
    seeds: { directory: './src/db/seeds' }
  },
  mysql2: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    },
    migrations: { directory: './src/db/migrations' },
    seeds: { directory: './src/db/seeds' }
  }
};

export default config[client];
