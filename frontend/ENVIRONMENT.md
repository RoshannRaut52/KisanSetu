# Frontend environment

Set this variable in Vercel Project Settings → Environment Variables for Production, Preview, and Development:

```text
VITE_API_URL=https://your-kisansetu-api.onrender.com
```

The app calls `${VITE_API_URL}/api/trpc`. Do not append `/api/trpc` to the value.
