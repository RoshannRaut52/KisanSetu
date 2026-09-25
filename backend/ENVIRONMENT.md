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
DATABASE_URL=postgresql://roshan:tt8XMRCxnuDxnNiBsrA86DHXIRFQIOks@dpg-dar1gi0473hc739g8m9g-a/kisansetu_gx11
OTP_MODE=mock
WHATSAPP_ENABLED=false
TWILIO_ENABLED=false
```

The current SIH demo domain is in-memory so it can be run immediately. `DATABASE_URL` is included for the PostgreSQL migration described in `../database/README.md`; connect the repository layer to the tables before treating the backend as production-persistent.
