package lodging_test

import (
	"booking/src/lodging"
	"context"
	"errors"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestHotelLookupKeepsDatabaseErrors(t *testing.T) {
	for _, save := range []bool{false, true} {
		name := "list_rooms"
		if save {
			name = "create_room"
		}
		t.Run(name, func(t *testing.T) {
			conn, mock, err := sqlmock.New()
			if err != nil {
				t.Fatal(err)
			}
			defer conn.Close()
			database, err := gorm.Open(postgres.New(postgres.Config{Conn: conn}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
			if err != nil {
				t.Fatal(err)
			}
			service := lodging.New(database)
			original := errors.New("legacy column cannot be decoded")
			if save {
				mock.ExpectBegin()
				mock.ExpectQuery("SELECT count").WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))
			}
			mock.ExpectQuery(`SELECT \* FROM "hotels"`).WillReturnError(original)
			if save {
				mock.ExpectRollback()
				_, err = service.SaveRoom(context.Background(), "actor", "hotel-id", "", lodging.RoomInput{Name: "Double", Capacity: 2, TotalRooms: 5, Active: true})
			} else {
				_, err = service.Rooms(context.Background(), "hotel-id")
			}
			if !errors.Is(err, original) {
				t.Fatalf("database error was masked: %v", err)
			}
			var failure *lodging.Failure
			if errors.As(err, &failure) {
				t.Fatalf("database failure misreported as HTTP %d", failure.Status)
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestMissingHotelStillReturns404(t *testing.T) {
	conn, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	database, err := gorm.Open(postgres.New(postgres.Config{Conn: conn}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	mock.ExpectQuery(`SELECT \* FROM "hotels"`).WillReturnRows(sqlmock.NewRows([]string{"id"}))
	_, err = lodging.New(database).Rooms(context.Background(), "missing-id")
	var failure *lodging.Failure
	if !errors.As(err, &failure) || failure.Status != 404 {
		t.Fatalf("expected 404, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}
