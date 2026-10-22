package bootstrap

import (
	"context"
	"io"

	"gorm.io/gorm"
)

// Run creates/grants the admin account and seeds data in one transaction.
func Run(ctx context.Context, conn *gorm.DB, in Options, password io.Reader) (Result, error) {
	if _, err := Validate(in); err != nil {
		return Result{}, err
	}
	var out Result
	err := conn.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		progress(in, "Preparing admin account...")
		if err := GrantAdmin(tx, in.OwnerEmail, "", true, password); err != nil {
			return err
		}
		var err error
		out, err = Seed(ctx, tx, in)
		return err
	})
	if err != nil {
		return Result{}, err
	}
	return out, nil
}
