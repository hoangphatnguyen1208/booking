CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email varchar(255) NOT NULL UNIQUE,
 hashed_password text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(255) NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS user_roles (user_id uuid NOT NULL REFERENCES users(id),role_id uuid NOT NULL REFERENCES roles(id),PRIMARY KEY(user_id,role_id));
CREATE TABLE IF NOT EXISTS hotels (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name varchar(100) NOT NULL,slug varchar(100) NOT NULL UNIQUE,
 address varchar(255),city varchar(100) NOT NULL,country varchar(100) NOT NULL,rank smallint NOT NULL DEFAULT 0,
 created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),deleted_at timestamptz
);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE TABLE IF NOT EXISTS hotel_members (
 hotel_id uuid NOT NULL REFERENCES hotels(id),user_id uuid NOT NULL REFERENCES users(id),
 role varchar(20) NOT NULL CHECK(role IN ('owner','manager','staff')),PRIMARY KEY(hotel_id,user_id)
);
CREATE TABLE IF NOT EXISTS room_types (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),hotel_id uuid NOT NULL REFERENCES hotels(id),
 name varchar(100) NOT NULL,capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 20),
 total_rooms integer NOT NULL CHECK(total_rooms BETWEEN 1 AND 10000),active boolean NOT NULL,
 created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS inventories (
 room_type_id uuid NOT NULL REFERENCES room_types(id),date date NOT NULL,
 capacity integer NOT NULL CHECK(capacity>=0),reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0 AND reserved<=capacity),
 price bigint NOT NULL CHECK(price BETWEEN 0 AND 1000000000000),PRIMARY KEY(room_type_id,date)
);
CREATE TABLE IF NOT EXISTS bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),
 hotel_id uuid NOT NULL REFERENCES hotels(id),room_type_id uuid NOT NULL REFERENCES room_types(id),
 idempotency_key varchar(100) NOT NULL,request_hash varchar(64) NOT NULL,
 hotel_name text NOT NULL,room_name text NOT NULL,check_in date NOT NULL,check_out date NOT NULL,
 rooms integer NOT NULL CHECK(rooms>0),guests integer NOT NULL CHECK(guests>0),
 guest_name varchar(100) NOT NULL,phone varchar(30) NOT NULL,
 status varchar(20) NOT NULL CHECK(status IN ('confirmed','cancelled','completed')),
 payment_status varchar(20) NOT NULL CHECK(payment_status IN ('unpaid','paid')),
 currency varchar(3) NOT NULL,total bigint NOT NULL CHECK(total>=0),cancel_before timestamptz NOT NULL,
 created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),
 UNIQUE(user_id,idempotency_key),CHECK(check_out>check_in)
);
CREATE TABLE IF NOT EXISTS booking_nights (
 booking_id uuid NOT NULL REFERENCES bookings(id),date date NOT NULL,
 price bigint NOT NULL CHECK(price>=0),rooms integer NOT NULL CHECK(rooms>0),
 PRIMARY KEY(booking_id,date)
);
CREATE TABLE IF NOT EXISTS audit_logs (
 id bigserial PRIMARY KEY,user_id uuid,method varchar(10) NOT NULL,path text NOT NULL,status integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hotels_deleted_at ON hotels(deleted_at);
CREATE INDEX IF NOT EXISTS idx_room_hotel ON room_types(hotel_id);
CREATE INDEX IF NOT EXISTS idx_booking_user_created ON bookings(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_hotel_created ON bookings(hotel_id,created_at DESC);
