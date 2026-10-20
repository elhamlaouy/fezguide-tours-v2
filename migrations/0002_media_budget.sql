-- Reservations are durable, including uploads never added to a document.
CREATE TABLE cms_upload_reservations (
 id TEXT PRIMARY KEY,
 actor TEXT NOT NULL CHECK(length(actor) BETWEEN 1 AND 256),
 created_at INTEGER NOT NULL,
 bytes INTEGER NOT NULL CHECK(bytes >= 0),
 state TEXT NOT NULL CHECK(state IN ('pending','stored','released')),
 object_key TEXT UNIQUE
);
CREATE INDEX cms_upload_actor_time ON cms_upload_reservations(actor, created_at);
CREATE INDEX cms_upload_state ON cms_upload_reservations(state);
