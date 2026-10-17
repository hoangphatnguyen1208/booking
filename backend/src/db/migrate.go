package db

import (
	"crypto/sha256"
	"embed"
	"fmt"
	"gorm.io/gorm"
	"sort"
	"time"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

type schemaMigration struct {
	Version   string `gorm:"primaryKey"`
	Checksum  string
	AppliedAt time.Time
}

func Migrate(conn *gorm.DB) error {
	return conn.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(current_schema() || ':booking-migrations',0))").Error; err != nil {
			return err
		}
		if err := tx.AutoMigrate(&schemaMigration{}); err != nil {
			return err
		}
		names, err := migrationFiles.ReadDir("migrations")
		if err != nil {
			return err
		}
		sort.Slice(names, func(i, j int) bool { return names[i].Name() < names[j].Name() })
		for _, name := range names {
			data, err := migrationFiles.ReadFile("migrations/" + name.Name())
			if err != nil {
				return err
			}
			checksum := fmt.Sprintf("%x", sha256.Sum256(data))
			var rows []schemaMigration
			if err := tx.Where("version = ?", name.Name()).Find(&rows).Error; err != nil {
				return err
			}
			if len(rows) > 0 {
				if rows[0].Checksum != checksum {
					return fmt.Errorf("migration %s was modified after application", name.Name())
				}
				continue
			}
			if err := tx.Exec(string(data)).Error; err != nil {
				return fmt.Errorf("migration %s: %w", name.Name(), err)
			}
			if err := tx.Create(&schemaMigration{Version: name.Name(), Checksum: checksum, AppliedAt: time.Now().UTC()}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
