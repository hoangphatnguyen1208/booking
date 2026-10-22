package main

import (
	"booking/internal/bootstrap"
	"booking/src/config"
	"booking/src/db"
	"context"
	"flag"
	"log"
	"time"
	_ "time/tzdata"
)

func main() {
	loc, err := time.LoadLocation("Asia/Ho_Chi_Minh")
	if err != nil {
		log.Fatal(err)
	}
	var in bootstrap.Options
	flag.StringVar(&in.OwnerEmail, "owner-email", "", "Existing registered owner email (required)")
	flag.IntVar(&in.Hotels, "hotels", 20, "Number of sample hotels, 1-100")
	flag.IntVar(&in.Days, "days", 90, "Days of daily inventory, 1-366")
	flag.StringVar(&in.From, "from", time.Now().In(loc).Format("2006-01-02"), "First inventory date in Vietnam, YYYY-MM-DD")
	flag.Parse()
	if _, err := bootstrap.Validate(in); err != nil {
		log.Fatal(err)
	}
	conn := db.Connect(config.NewEnv())
	if err := db.Migrate(conn); err != nil {
		log.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	out, err := bootstrap.Seed(ctx, conn, in)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("Created %d sample hotels, %d room types, %d room-night inventory rows; skipped %d existing hotels", out.Hotels, out.Rooms, out.Nights, out.Skipped)
}
