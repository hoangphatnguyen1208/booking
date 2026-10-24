CREATE TABLE saved_hotels (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, hotel_id)
);
CREATE INDEX saved_hotels_hotel_id_idx ON saved_hotels(hotel_id);
