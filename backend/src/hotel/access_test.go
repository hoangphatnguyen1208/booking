package hotel

import (
	"booking/src/permission"
	"context"
	"errors"
	"github.com/DATA-DOG/go-sqlmock"
	"testing"
)

func TestCustomerCannotCreateHotel(t *testing.T) {
	repo, mock := testRepository(t)
	mock.ExpectQuery(`SELECT count\(\*\) FROM user_roles ur`).WithArgs("customer", "admin").WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))
	_, err := NewService(repo).CreateForActor(context.Background(), "customer", &CreateRequest{Name: "Hotel", Slug: "hotel", City: "Hue", Country: "VN"})
	if !errors.Is(err, permission.ErrForbidden) {
		t.Fatalf("expected forbidden, got %v", err)
	}
}
