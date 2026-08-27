-- A fixed, pre-set signature for the studio/provider side of a contract
-- (e.g. Hidopa Lab's own signature), stamped onto every generated contract
-- PDF alongside the client's electronically-captured signature. This is not
-- an audit-trail event like the client's signature (no timestamp/IP) — it's
-- a standing graphic the admin uploads once in Settings.
alter table studios add column provider_signer_name text;
alter table studios add column provider_signature_url text;
