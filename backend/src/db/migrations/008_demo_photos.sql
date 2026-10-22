-- Illustrative Unsplash photos for demo data only; never replace owner-supplied images.
WITH photos AS (SELECT ARRAY['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=960&q=80','https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=960&q=80','https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=960&q=80','https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=960&q=80'] AS urls)
UPDATE hotels SET image_url = photos.urls[((substring(slug from '[0-9]+$')::int - 1) % 4) + 1] FROM photos WHERE slug ~ '^booking-demo-[0-9]{3}$' AND image_url = '' AND deleted_at IS NULL;
UPDATE room_types r SET image_url = CASE r.name
 WHEN 'Standard giường đôi' THEN 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=960&q=80'
 WHEN 'Deluxe ban công' THEN 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=960&q=80'
 WHEN 'Family Suite' THEN 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=960&q=80'
 ELSE r.image_url END FROM hotels h WHERE r.hotel_id=h.id AND h.slug ~ '^booking-demo-[0-9]{3}$' AND h.deleted_at IS NULL AND r.image_url='';
