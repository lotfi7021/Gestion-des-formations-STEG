-- ============================================================
-- MIGRATION : Fusion Employe -> User (role='employe')
-- À exécuter UNE FOIS, backend arrêté.
-- Idempotent : peut être relancé sans dupliquer les données.
-- ============================================================
USE gestion_formations;

-- 1. Créer/mettre à jour un User role='employe' pour chaque Employe
--    (password = hash bcrypt de '123456' — même défaut que le seed)
INSERT INTO users (id, username, email, password, role, isActive, nom, prenom, telephone,
                   poste, departement, directionText, dateEmbauche, identifiant, noteGlobale, createdAt, updatedAt)
SELECT e.id,
       COALESCE(e.identifiant, REPLACE(u.username, ' ', '_')),
       e.email,
       COALESCE(u.password, '$2b$10$3euPcmQFCiblsZeEu6s7uOgQ8rC0pbjJ8C1vIONvGFcCvxFPHkS6a'),
       'employe',
       TRUE,
       e.nom,
       e.prenom,
       e.telephone,
       e.poste,
       e.departement,
       e.directionText,
       e.dateEmbauche,
       e.identifiant,
       0,
       COALESCE(u.createdAt, NOW()),
       NOW()
FROM employes e
LEFT JOIN users u ON u.email = e.email
WHERE NOT EXISTS (SELECT 1 FROM users u2 WHERE u2.id = e.id)
  AND NOT EXISTS (SELECT 1 FROM users u3 WHERE u3.email = e.email);

-- 2. Si un User existait déjà avec le même email (cas miroir), le passer en role='employe'
--    et compléter ses champs STEG manquants
UPDATE users u
JOIN employes e ON e.email = u.email
SET u.role = 'employe',
    u.nom = COALESCE(NULLIF(u.nom, ''), e.nom),
    u.prenom = COALESCE(NULLIF(u.prenom, ''), e.prenom),
    u.telephone = COALESCE(u.telephone, e.telephone),
    u.poste = COALESCE(u.poste, e.poste),
    u.departement = COALESCE(u.departement, e.departement),
    u.directionText = COALESCE(u.directionText, e.directionText),
    u.dateEmbauche = COALESCE(u.dateEmbauche, e.dateEmbauche),
    u.identifiant = COALESCE(u.identifiant, e.identifiant)
WHERE u.role <> 'admin';

-- 3. Inscriptions : rattacher les inscriptions des Users miroirs existants (rien à faire si déjà OK)
--    (les inscriptions référencent userId — conservées telles quelles)

-- 4. session_employes -> session_participants
--    Convertit chaque lien employé-session en lien user-session (sans doublon)
INSERT IGNORE INTO session_participants (session_id, user_id)
SELECT se.session_id, u.id
FROM session_employes se
JOIN users u ON u.id = se.employe_id;

INSERT IGNORE INTO session_participants (session_id, user_id)
SELECT se.session_id, u.id
FROM session_employes se
JOIN employes e ON e.id = se.employe_id
JOIN users u ON u.email = e.email
WHERE u.id <> se.employe_id;

-- ============================================================
-- Nettoyage (après vérification des étapes précédentes)
-- ============================================================
-- DROP TABLE IF EXISTS session_employes;
-- DROP TABLE IF EXISTS employes;
-- (les DROP sont volontairement commentés : TypeORM synchronize les supprimera
--  automatiquement au premier démarrage après la suppression de l'entité Employe)
