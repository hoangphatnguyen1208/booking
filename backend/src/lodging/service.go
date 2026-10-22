package lodging

import (
	"booking/src/hotel"
	"booking/src/permission"
	"context"
	"errors"
	"fmt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"strings"
	"time"
)

type Failure struct {
	Status  int
	Message string
}

func (e *Failure) Error() string        { return e.Message }
func fail(status int, msg string) error { return &Failure{status, msg} }
func dbError(err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return fail(404, "Not found")
	}
	return err
}

func requireHotel(ctx context.Context, conn *gorm.DB, id string) error {
	_, err := hotel.NewService(hotel.NewRepository(conn)).FindByID(ctx, id)
	if errors.Is(err, hotel.ErrHotelNotFound) {
		return fail(404, "Hotel not found")
	}
	if err != nil {
		return fmt.Errorf("load hotel %s: %w", id, err)
	}
	return nil
}

type RoomInput struct {
	Name       string `json:"name" binding:"required,max=100"`
	Capacity   int    `json:"capacity" binding:"required,min=1,max=20"`
	TotalRooms int    `json:"total_rooms" binding:"required,min=1,max=10000"`
	Active     bool   `json:"active"`
}

// Rooms lists active room types.
// @Summary List active room types
// @Tags Rooms
// @Produce json
// @Param id path string true "Hotel UUID"
// @Success 200 {array} RoomType
// @Failure 404 {object} map[string]string
// @Router /hotels/{id}/room-types [get]
func (s *Service) Rooms(ctx context.Context, id string) ([]RoomType, error) {
	if err := requireHotel(ctx, s.DB, id); err != nil {
		return nil, err
	}
	rooms := []RoomType{}
	err := s.DB.WithContext(ctx).Where("hotel_id = ? AND active = ?", id, true).Order("created_at,id").Find(&rooms).Error
	return rooms, err
}

// SaveRoom creates or replaces a room type.
// @Summary Save room type
// @Tags Rooms
// @Security OAuth2Password
// @Accept json
// @Produce json
// @Param id path string true "Hotel UUID for POST, room UUID for PUT"
// @Param request body RoomInput true "Room fields"
// @Success 200 {object} RoomType
// @Success 201 {object} RoomType
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 409 {object} map[string]string
// @Router /hotels/{id}/room-types [post]
// @Router /room-types/{id} [put]
func (s *Service) SaveRoom(ctx context.Context, actor, hotelID, id string, in RoomInput) (*RoomType, error) {
	if strings.TrimSpace(in.Name) == "" {
		return nil, fail(400, "Name is required")
	}
	var room RoomType
	err := s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if id != "" {
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&room, "id = ?", id).Error; err != nil {
				return dbError(err)
			}
			hotelID = room.HotelID
		}
		if err := permission.New(tx).Require(ctx, actor, hotelID, "edit"); err != nil {
			return err
		}
		if err := requireHotel(ctx, tx, hotelID); err != nil {
			return err
		}
		var count int64
		if id != "" {
			if err := tx.Model(&Inventory{}).Where("room_type_id = ? AND capacity > ?", id, in.TotalRooms).Count(&count).Error; err != nil {
				return err
			}
			if count > 0 {
				return fail(409, "Reduce daily inventory before reducing total rooms")
			}
		}
		if id == "" {
			room = RoomType{HotelID: hotelID, Name: strings.TrimSpace(in.Name), Capacity: in.Capacity, TotalRooms: in.TotalRooms, Active: in.Active}
			return tx.Create(&room).Error
		}
		return tx.Model(&room).Updates(map[string]any{"name": strings.TrimSpace(in.Name), "capacity": in.Capacity, "total_rooms": in.TotalRooms, "active": in.Active}).Error
	})
	return &room, err
}
func dates(from, to string, max int) ([]time.Time, error) {
	start, e1 := time.Parse("2006-01-02", from)
	end, e2 := time.Parse("2006-01-02", to)
	if e1 != nil || e2 != nil || !end.After(start) || end.Sub(start) > time.Duration(max)*24*time.Hour {
		return nil, fail(400, fmt.Sprintf("Dates must use YYYY-MM-DD and span 1-%d nights", max))
	}
	days := []time.Time{}
	for d := start; d.Before(end); d = d.AddDate(0, 0, 1) {
		days = append(days, d)
	}
	return days, nil
}

type InventoryInput struct {
	From     string `json:"from" binding:"required"`
	To       string `json:"to" binding:"required"`
	Capacity int    `json:"capacity" binding:"min=0,max=10000"`
	Price    int64  `json:"price" binding:"min=0,max=1000000000000"`
}

// PutInventory replaces price and capacity without changing reservations.
// @Summary Set daily price and inventory
// @Tags Inventory
// @Security OAuth2Password
// @Accept json
// @Produce json
// @Param id path string true "Room type UUID"
// @Param request body InventoryInput true "Date range [from,to)"
// @Success 200 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 409 {object} map[string]string
// @Router /room-types/{id}/inventory [put]
func (s *Service) PutInventory(ctx context.Context, actor, id string, in InventoryInput) error {
	days, err := dates(in.From, in.To, 366)
	if err != nil {
		return err
	}
	return s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var room RoomType
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&room, "id = ?", id).Error; err != nil {
			return dbError(err)
		}
		if err := permission.New(tx).Require(ctx, actor, room.HotelID, "edit"); err != nil {
			return err
		}
		if in.Capacity > room.TotalRooms {
			return fail(400, "Daily capacity exceeds room total")
		}
		var count int64
		if err := tx.Model(&Inventory{}).Where("room_type_id = ? AND date >= ? AND date < ? AND reserved > ?", id, in.From, in.To, in.Capacity).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return fail(409, "Capacity cannot be lower than reserved rooms")
		}
		rows := make([]Inventory, 0, len(days))
		for _, day := range days {
			rows = append(rows, Inventory{RoomTypeID: id, Date: day, Capacity: in.Capacity, Price: in.Price})
		}
		return tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "room_type_id"}, {Name: "date"}}, DoUpdates: clause.AssignmentColumns([]string{"capacity", "price"})}).Create(&rows).Error
	})
}

// Inventory reads manager inventory.
// @Summary Get daily inventory
// @Tags Inventory
// @Security OAuth2Password
// @Produce json
// @Param id path string true "Room type UUID"
// @Param from query string true "Inclusive YYYY-MM-DD"
// @Param to query string true "Exclusive YYYY-MM-DD"
// @Success 200 {array} Inventory
// @Router /room-types/{id}/inventory [get]
func (s *Service) Inventory(ctx context.Context, actor, id, from, to string) ([]Inventory, error) {
	if _, err := dates(from, to, 366); err != nil {
		return nil, err
	}
	var room RoomType
	if err := s.DB.WithContext(ctx).First(&room, "id = ?", id).Error; err != nil {
		return nil, dbError(err)
	}
	if err := permission.New(s.DB).Require(ctx, actor, room.HotelID, "edit"); err != nil {
		return nil, err
	}
	rows := []Inventory{}
	err := s.DB.WithContext(ctx).Where("room_type_id = ? AND date >= ? AND date < ?", id, from, to).Order("date").Find(&rows).Error
	return rows, err
}

type AvailableRoom struct {
	Room      RoomType    `json:"room"`
	Available int         `json:"available"`
	Total     int64       `json:"total"`
	Currency  string      `json:"currency"`
	Nights    []Inventory `json:"nights"`
}

// Availability checks every night of a stay.
// @Summary Find available room types and total VND price
// @Tags Rooms
// @Produce json
// @Param id path string true "Hotel UUID"
// @Param check_in query string true "YYYY-MM-DD"
// @Param check_out query string true "YYYY-MM-DD"
// @Param rooms query int false "Rooms" default(1)
// @Param guests query int false "Guests" default(2)
// @Success 200 {array} AvailableRoom
// @Router /hotels/{id}/availability [get]
func (s *Service) Availability(ctx context.Context, id, from, to string, rooms, guests int) ([]AvailableRoom, error) {
	days, err := dates(from, to, 90)
	if err != nil {
		return nil, err
	}
	if rooms < 1 || rooms > 100 || guests < 1 || guests > 2000 {
		return nil, fail(400, "Invalid rooms or guests")
	}
	types, err := s.Rooms(ctx, id)
	if err != nil {
		return nil, err
	}
	result := []AvailableRoom{}
	for _, room := range types {
		if room.Capacity*rooms < guests {
			continue
		}
		rows := []Inventory{}
		if err := s.DB.WithContext(ctx).Where("room_type_id = ? AND date >= ? AND date < ?", room.ID, from, to).Order("date").Find(&rows).Error; err != nil {
			return nil, err
		}
		if len(rows) != len(days) {
			continue
		}
		available := room.TotalRooms
		var total int64
		for _, row := range rows {
			if row.Capacity-row.Reserved < available {
				available = row.Capacity - row.Reserved
			}
			total += row.Price * int64(rooms)
		}
		if available >= rooms {
			result = append(result, AvailableRoom{room, available, total, "VND", rows})
		}
	}
	return result, nil
}
