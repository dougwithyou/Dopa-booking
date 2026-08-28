-- The public signing form now collects the signer's email (not just name),
-- so a contract created without a pre-linked client can still capture who
-- signed and link/create a CRM client from it at signing time.
alter table contracts add column signer_email text;
