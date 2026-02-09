# Noname Monorepo

Monorepo for **Noname**: Windows desktop app, mobile PWA, and backend relay + leaderboard + DNS filtering service.

## Quick start

```bash
npm install
npm run start
```

### Backend

```bash
cd apps/backend
npm run dev
```

### Web (PWA)

```bash
cd apps/web
npm run dev
```

### Windows (WPF .NET 8)

```bash
cd apps/windows
# Build single-file self-contained exe
pwsh -File ../../scripts/build-windows.ps1
```

## Deployment (backend)

- Works on any Node 18+ host (Render/Fly/Railway).
- Set `DATABASE_URL` if using Postgres. Otherwise it falls back to local SQLite file `data/noname.db`.
- Ensure WebSocket endpoint is reachable publicly.

## DNS filtering (mobile without app)

Noname provides a **DNS-over-HTTPS** endpoint and a **DNS-over-TLS** endpoint. Users configure mobile DNS:

### Android (Private DNS)
1. Settings → Network & Internet → Private DNS
2. Set to **Private DNS provider hostname**
3. Enter: `dns.noname.example` (replace with your backend domain)

### iOS (mobileconfig)
1. Open the PWA settings page
2. Download the generated `.mobileconfig`
3. Install via Settings → General → VPN & Device Management

> iOS restrictions: profiles only apply to supported iOS versions. Noname generates the profile and shows steps.

## Limitations (honest)
- The backend never stores images. Relay holds image bytes in memory for <30s and deletes immediately after forward.
- Mobile blocking without an app/MDM is best effort; DNS filtering cannot block apps that bypass system DNS.

## Scripts
- `npm run start`: backend + web
- `npm run build-backend`
- `npm run build-web`
- `npm run build-windows`

## Project structure
```
/apps/windows   # WPF .NET 8 desktop app
/apps/web       # Vite PWA for mobile
/apps/backend   # Node API + WebSocket + DNS
/packages/shared# DTOs and validations
```
