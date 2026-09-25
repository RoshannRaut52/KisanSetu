# KisanSetu PostgreSQL database

## Render PostgreSQL

1. Create a Render PostgreSQL database in the same region as the backend.
2. Copy the **Internal Database URL** into the Render backend service as `DATABASE_URL`.
3. Use the External Database URL only for local pgAdmin4 access when Render exposes it.
4. Keep the database credentials private; do not commit them to GitHub.

## pgAdmin4 connection

Create a new server in pgAdmin4 using the Render PostgreSQL values:

- Host: Render hostname from the External Database URL
- Port: usually `5432`
- Maintenance database: database name from the URL
- Username: database user from the URL
- Password: database password from the URL
- SSL mode: `require` unless Render’s current connection settings specify otherwise

Open **Tools → Query Tool**, load `kisansetu_full_schema.sql`, and execute it once against the selected database. The script creates enum types, all tables, primary keys, foreign keys, checks, indexes, timestamp triggers, and demo configuration data.

## What the script creates

The schema includes identity and roles, farmer/operator profiles, centres and capacity, operating hours, crops, configured prices, QC rules, bookings, slot reservations, queue entries, procurement records, QC, weighment, payment/reference states, queue events, notifications, audit logs, and ML model/prediction traceability.

## Verification queries

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT
  conrelid::regclass AS table_name,
  conname,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype IN ('p', 'f')
ORDER BY 1, 2;

SELECT c.name, c.status, cap.daily_farmer_capacity
FROM centres c
JOIN centre_capacity cap ON cap.centre_id = c.id;
```

## Important implementation note

The current split deployment keeps the SIH demo queue state in backend memory so the deployment can be demonstrated immediately. The PostgreSQL schema is complete and ready for the repository layer; wire booking, queue, event, notification, and procurement writes to the tables before relying on Render restarts or horizontal scaling for production data durability.
