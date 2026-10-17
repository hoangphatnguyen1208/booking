package hotel

import (
	"context"
	"errors"
	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"testing"
	"time"
)

func testRepository(t *testing.T) (*Repository, sqlmock.Sqlmock) {
	t.Helper()
	conn, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		conn.Close()
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Error(err)
		}
	})
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: conn}), &gorm.Config{TranslateError: true})
	if err != nil {
		t.Fatal(err)
	}
	return NewRepository(db), mock
}
func TestUpdateReturnsPersistedHotelAndZeroValues(t *testing.T) {
	repo, mock := testRepository(t)
	id := "11111111-1111-1111-1111-111111111111"
	now := time.Now().UTC()
	mock.ExpectBegin()
	mock.ExpectQuery(`UPDATE "hotels" SET .* RETURNING \*`).WithArgs("", "[]", "Hue", "VN", "", "New", 0, "new", sqlmock.AnyArg(), id).WillReturnRows(sqlmock.NewRows([]string{"id", "name", "slug", "address", "city", "country", "rank", "created_at", "updated_at"}).AddRow(id, "New", "new", "", "Hue", "VN", 0, now, now))
	mock.ExpectCommit()
	h, err := repo.Update(context.Background(), id, &Hotel{Name: "New", Slug: "new", City: "Hue", Country: "VN"})
	if err != nil {
		t.Fatal(err)
	}
	if h.ID != id || h.CreatedAt.IsZero() || h.Address != "" || h.Rank != 0 {
		t.Fatalf("unexpected response: %+v", h)
	}
}
func TestUpdateMissingHotel(t *testing.T) {
	repo, mock := testRepository(t)
	mock.ExpectBegin()
	mock.ExpectQuery(`UPDATE "hotels"`).WillReturnRows(sqlmock.NewRows([]string{"id"}))
	mock.ExpectCommit()
	_, err := repo.Update(context.Background(), "missing", &Hotel{Name: "New"})
	if !errors.Is(err, ErrHotelNotFound) {
		t.Fatalf("got %v", err)
	}
}
func TestUpdateDuplicateSlug(t *testing.T) {
	repo, mock := testRepository(t)
	mock.ExpectBegin()
	mock.ExpectQuery(`UPDATE "hotels"`).WillReturnError(gorm.ErrDuplicatedKey)
	mock.ExpectRollback()
	_, err := repo.Update(context.Background(), "id", &Hotel{Slug: "duplicate"})
	if !errors.Is(err, ErrSlugExists) {
		t.Fatalf("got %v", err)
	}
}
func TestDeleteMissingHotel(t *testing.T) {
	repo, mock := testRepository(t)
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "hotels"`).WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectCommit()
	if err := repo.Delete(context.Background(), &Hotel{ID: "id"}); !errors.Is(err, ErrHotelNotFound) {
		t.Fatalf("got %v", err)
	}
}
