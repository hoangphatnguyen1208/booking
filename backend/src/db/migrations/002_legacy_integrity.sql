DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mvp_hotel_members_hotel_id' AND connamespace = current_schema()::regnamespace) THEN
 ALTER TABLE hotel_members ADD CONSTRAINT fk_mvp_hotel_members_hotel_id FOREIGN KEY (hotel_id) REFERENCES hotels(id);
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mvp_hotel_members_user_id' AND connamespace = current_schema()::regnamespace) THEN
 ALTER TABLE hotel_members ADD CONSTRAINT fk_mvp_hotel_members_user_id FOREIGN KEY (user_id) REFERENCES users(id);
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mvp_room_types_hotel_id' AND connamespace = current_schema()::regnamespace) THEN
 ALTER TABLE room_types ADD CONSTRAINT fk_mvp_room_types_hotel_id FOREIGN KEY (hotel_id) REFERENCES hotels(id);
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mvp_inventories_room_type_id' AND connamespace = current_schema()::regnamespace) THEN
 ALTER TABLE inventories ADD CONSTRAINT fk_mvp_inventories_room_type_id FOREIGN KEY (room_type_id) REFERENCES room_types(id);
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mvp_bookings_user_id' AND connamespace = current_schema()::regnamespace) THEN
 ALTER TABLE bookings ADD CONSTRAINT fk_mvp_bookings_user_id FOREIGN KEY (user_id) REFERENCES users(id);
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mvp_bookings_hotel_id' AND connamespace = current_schema()::regnamespace) THEN
 ALTER TABLE bookings ADD CONSTRAINT fk_mvp_bookings_hotel_id FOREIGN KEY (hotel_id) REFERENCES hotels(id);
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mvp_bookings_room_type_id' AND connamespace = current_schema()::regnamespace) THEN
 ALTER TABLE bookings ADD CONSTRAINT fk_mvp_bookings_room_type_id FOREIGN KEY (room_type_id) REFERENCES room_types(id);
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mvp_booking_nights_booking_id' AND connamespace = current_schema()::regnamespace) THEN
 ALTER TABLE booking_nights ADD CONSTRAINT fk_mvp_booking_nights_booking_id FOREIGN KEY (booking_id) REFERENCES bookings(id);
 END IF;
END $$;
INSERT INTO roles (name) VALUES ('admin') ON CONFLICT(name) DO NOTHING;
