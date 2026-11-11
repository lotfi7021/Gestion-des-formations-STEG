import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function backfill() {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'gestion_formations',
    entities: [path.resolve(__dirname, '../entities/**/*.entity.ts')],
  });

  await ds.initialize();
  const em = ds.manager;

  for (const table of ['formations', 'sessions', 'users']) {
    const records: { id: string; clonedFromCabinetId: string }[] = await em.query(
      `SELECT id, \`clonedFromCabinetId\` FROM ${table} WHERE \`clonedFromCabinetId\` IS NOT NULL AND \`clonedFromCabinetName\` IS NULL`,
    );

    for (const r of records) {
      const cabinet: { nom: string }[] = await em.query(
        `SELECT nom FROM users WHERE id = ? AND role = 'cabinet'`,
        [r.clonedFromCabinetId],
      );
      const name = cabinet[0]?.nom ?? null;

      if (name) {
        await em.query(
          `UPDATE ${table} SET \`clonedFromCabinetName\` = ? WHERE id = ?`,
          [name, r.id],
        );
        console.log(`Updated ${table} ${r.id} → ${name}`);
      }
    }

    console.log(`Done: ${table} (${records.length} records)`);
  }

  await ds.destroy();
  console.log('Backfill complete');
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
