/**
 * Migration : fusion Employe -> User (role='employe') + unification des participants.
 * À exécuter UNE FOIS : node scripts/migrate-employes.js (depuis Gestion-Formation-Back-main)
 * Idempotent : peut être relancé sans dupliquer.
 */
const path = require('path');
const fs = require('fs');

// Chargement .env
try {
  require('dotenv').config();
} catch {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'gestion_formations',
    multipleStatements: true,
  });

  console.log('→ Vérification des tables…');
  const [tables] = await conn.query("SHOW TABLES LIKE 'employes'");
  if (tables.length === 0) {
    console.log('✓ Table employes absente — rien à migrer.');
    await conn.end();
    return;
  }

  // ── 1. Créer les Users role='employe' pour chaque Employe sans user miroir ──
  const [employes] = await conn.query('SELECT * FROM employes');
  console.log(`→ ${employes.length} employé(s) trouvé(s) dans l'ancienne table.`);

  // Hash bcrypt de '123456' (mot de passe par défaut du seed)
  const DEFAULT_HASH = '$2b$10$3euPcmQFCiblsZeEu6s7uOgQ8rC0pbjJ8C1vIONvGFcCvxFPHkS6a';

  let created = 0;
  let updated = 0;
  for (const e of employes) {
    const [users] = await conn.query('SELECT * FROM users WHERE email = ? OR id = ? LIMIT 1', [
      e.email,
      e.id,
    ]);
    const existing = users[0];

    if (!existing) {
      await conn.query(
        `INSERT INTO users (id, username, email, password, role, isActive, nom, prenom, telephone,
                            poste, departement, directionText, dateEmbauche, identifiant, noteGlobale)
         VALUES (?, ?, ?, ?, 'employe', 1, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          e.id,
          e.identifiant || e.email.split('@')[0],
          e.email,
          DEFAULT_HASH,
          e.nom,
          e.prenom,
          e.telephone,
          e.poste,
          e.departement,
          e.directionText,
          e.dateEmbauche,
          e.identifiant,
        ],
      );
      created++;
    } else {
      // Compléter le profil STEG du user existant (sans écraser les valeurs présentes)
      await conn.query(
        `UPDATE users SET
           role = IF(role = 'admin', role, 'employe'),
           nom = IF(nom IS NULL OR nom = '', ?, nom),
           prenom = IF(prenom IS NULL OR prenom = '', ?, prenom),
           telephone = COALESCE(telephone, ?),
           poste = COALESCE(poste, ?),
           departement = COALESCE(departement, ?),
           directionText = COALESCE(directionText, ?),
           dateEmbauche = COALESCE(dateEmbauche, ?),
           identifiant = COALESCE(identifiant, ?)
         WHERE id = ?`,
        [
          e.nom,
          e.prenom,
          e.telephone,
          e.poste,
          e.departement,
          e.directionText,
          e.dateEmbauche,
          e.identifiant,
          existing.id,
        ],
      );
      updated++;
    }
  }
  console.log(`✓ Users créés : ${created}, Users mis à jour : ${updated}`);

  // ── 2. session_employes -> session_participants ──
  const [seTables] = await conn.query("SHOW TABLES LIKE 'session_employes'");
  if (seTables.length > 0) {
    // Mapper employe_id -> user_id (par id puis par email)
    const [links] = await conn.query('SELECT * FROM session_employes');
    let migrated = 0;
    for (const link of links) {
      // Trouver l'user correspondant (même id, sinon même email)
      const [rows] = await conn.query(
        `SELECT u.id FROM users u LEFT JOIN employes e ON e.id = ? 
         WHERE u.id = ? OR (e.id IS NOT NULL AND u.email = e.email) LIMIT 1`,
        [link.employe_id, link.employe_id],
      );
      const userId = rows[0]?.id;
      if (!userId) {
        console.warn(`  ⚠ Aucun user pour employe_id=${link.employe_id} (session ${link.session_id})`);
        continue;
      }
      // Insert sans doublon
      const [existing] = await conn.query(
        'SELECT 1 FROM session_participants WHERE session_id = ? AND user_id = ? LIMIT 1',
        [link.session_id, userId],
      );
      if (existing.length === 0) {
        await conn.query('INSERT INTO session_participants (session_id, user_id) VALUES (?, ?)', [
          link.session_id,
          userId,
        ]);
        migrated++;
      }
    }
    console.log(`✓ Liens session_employes migrés : ${migrated}/${links.length}`);
  }

  await conn.end();
  console.log('✅ Migration terminée. (Les tables employes/session_employes seront droppées par TypeORM synchronize au redémarrage.)');
}

main().catch((err) => {
  console.error('❌ Échec migration :', err.message);
  process.exit(1);
});
