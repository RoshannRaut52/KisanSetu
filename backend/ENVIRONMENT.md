# Render backend environment

Create a Render **Web Service** from the `backend` directory:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Health check path: `/healthz`
- Runtime: Node 20+

Set these variables in Render:

```text
NODE_ENV=production
FRONTEND_ORIGIN=https://frontend-tan-eight-75.vercel.app
DATABASE_URL=<Render PostgreSQL Internal Database URL — set only in Render, never commit it>
OTP_MODE=mock
WHATSAPP_ENABLED=false
TWILIO_ENABLED=false
```

With `DATABASE_URL` configured, the backend uses PostgreSQL for centres, bookings, queue entries, procurement, QC, weighment, payment references, notifications, and queue events. Unit tests use the deterministic in-memory adapter when `NODE_ENV=test`.
