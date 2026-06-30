-- Cahier des charges: une seule table, structure très simple.
-- Attributs (exactement comme spécifié): ID, username, password, MFA, gendate, expired.
CREATE TABLE IF NOT EXISTS users (
  id    SERIAL PRIMARY KEY,       -- ID (ex: 1)
  username VARCHAR(255) UNIQUE NOT NULL,  -- ex: michel.ranu
  password TEXT,                  -- mot de passe chiffré (ex: AAAA...GGGG==)
  mfa    TEXT,                    -- MFA chiffré (ex: AAAA...BBBB=)
  gendate BIGINT,                 -- date de génération, timestamp Unix (ex: 1721916574)
  expired SMALLINT DEFAULT 0      -- 0 = valide, 1 = expiré (> 6 mois)
);
