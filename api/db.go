package api

import (
	"database/sql"
	"log"
)

func setupDatabase(db *sql.DB) error {
	migrations := []string{
		/* 000 */ `CREATE TABLE IF NOT EXISTS schema_version (version INT PRIMARY KEY, timestamp TIMESTAMP)`,
		/* 001 */ `CREATE TABLE IF NOT EXISTS launch_subscribers (email TEXT PRIMARY KEY)`,
		/* 002 */ `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,
		/* 003 */ `CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL, password TEXT NOT NULL DEFAULT '');
				   CREATE UNIQUE INDEX idx_users_email ON users (email)`,
		/* 004 */ `CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TIMESTAMP NOT NULL)`,
		/* 005 */ `ALTER TABLE sessions RENAME TO auth_sessions`,
		/* 006 */ `CREATE TABLE reading_sessions (
					   user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
					   timestamp BIGINT NOT NULL,
					   duration  INT NOT NULL,
					   PRIMARY KEY (user_id, timestamp)
					)`,
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}

	// Always run migration 0 as a setup.
	_, err = tx.Exec(migrations[0])
	if err != nil {
		tx.Rollback()
		return err
	}
	_, err = tx.Exec("INSERT INTO schema_version VALUES (0, now()) ON CONFLICT DO NOTHING")
	if err != nil {
		tx.Rollback()
		return err
	}

	maxVersion := 0
	err = tx.QueryRow("SELECT version FROM schema_version ORDER BY version DESC FOR UPDATE").Scan(&maxVersion)
	if err != nil {
		tx.Rollback()
		return err
	}

	log.Printf("Current schema version is %d. Latest available is %d.", maxVersion, len(migrations)-1)

	for i := maxVersion + 1; i < len(migrations); i++ {
		migrationSQL := migrations[i]

		log.Printf("Running migration %d (%s...)", i, migrationSQL[:40])
		_, err = tx.Exec(migrationSQL)
		if err != nil {
			tx.Rollback()
			return err
		}

		_, err = tx.Exec("INSERT INTO schema_version VALUES ($1, now())", i)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}
