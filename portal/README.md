# AI Therapist Portal

A modern web portal for therapists to manage patients, assessments, and sessions on laptop/desktop. Built with React, TypeScript, and Tailwind CSS.

**Features:**
- ✅ JWT authentication (same as mobile app)
- ✅ Patient dashboard & management
- ✅ Assessment administration
- ✅ Session notes & AI summaries
- ✅ Role-based access control (therapist/admin/patient)
- ✅ Responsive design
- ✅ Auto-token refresh on 401

---

## Quick Start

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm or yarn

### Installation

```bash
cd portal
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

Outputs to `dist/` directory.

---

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
VITE_API_URL=https://aitherapistapp-production.up.railway.app
VITE_APP_NAME=AI Therapist Portal
```

**Note:** The API URL must be the same as your backend (typically Railway production).

---

## Project Structure

```
src/
├── components/        # React components (UI, layout)
├── pages/            # Page components (routes)
├── services/         # API client, auth, storage
├── store/            # State management (Zustand)
├── types/            # TypeScript types
├── App.tsx           # Main app with routing
└── main.tsx          # Entry point

public/              # Static assets
Dockerfile          # Container config
vite.config.ts      # Vite build config
tailwind.config.js  # Tailwind CSS config
```

---

## Authentication Flow

The portal uses the **same JWT flow** as the mobile app:

1. **Login:** `POST /auth/login` → receives `access_token` & `refresh_token`
2. **Storage:** Tokens stored in browser `localStorage`
3. **Requests:** Access token auto-attached to all API requests
4. **Refresh:** On 401 response, refresh token exchanged for new access token
5. **Logout:** `POST /auth/logout` → tokens cleared from storage

**Key Files:**
- `src/services/api.ts` — Axios client with auto-refresh
- `src/services/storage.ts` — Token management
- `src/store/authStore.ts` — Auth state (Zustand)
- `src/pages/Login.tsx` — Login UI

---

## API Integration

All endpoints use the shared backend API. Examples:

```typescript
// Auth
POST   /auth/login              Login with email/password
POST   /auth/refresh            Refresh access token
POST   /auth/logout             Logout & revoke session

// Patients
GET    /patients                List all patients
GET    /patients/{id}           Get patient details
PATCH  /patients/{id}           Update patient
POST   /patients                Create patient

// Assessments
GET    /assessments/templates   List available tests
GET    /patients/{id}/assessments
POST   /patients/{id}/assessments

// Sessions
GET    /patients/{id}/sessions
POST   /patients/{id}/sessions
PATCH  /sessions/{id}

// Dashboard
GET    /dashboard               Stats & overview
```

See backend README for full API docs.

---

## Deployment (Railway)

### Option 1: Auto-Deploy from GitHub

1. Push code to GitHub
2. In Railway, create new project
3. Select "Deploy from GitHub repo"
4. Choose this repo
5. Railway auto-detects Dockerfile

### Option 2: Manual Deploy

```bash
# Build locally
npm run build

# Deploy via Railway CLI
railway deploy
```

### Environment Variables (Railway)

Set in Railway project settings:

```
VITE_API_URL=https://aitherapistapp-production.up.railway.app
```

### Railway Config

Create `railway.toml`:

```toml
[build]
builder = "docker"

[deploy]
startCommand = "serve -s dist -l 3000"
healthcheckPath = "/"
ports = [3000]
```

---

## Development Tips

### Debugging Auth Issues

Check browser dev tools:
- **Application > LocalStorage:** Look for `auth.access_token` and `auth.refresh_token`
- **Network tab:** Verify `Authorization: Bearer <token>` header on requests
- **Console:** Auth errors logged with `[AUTH]` prefix

### Testing Login Locally

With backend running on `http://localhost:8001`:

```bash
# Update vite.config.ts proxy:
proxy: {
  '/api': {
    target: 'http://localhost:8001',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
}

# Then npm run dev
# Login uses credentials (any email/password for demo)
```

### Bypass CORS (Dev Only)

If backend isn't setting CORS headers:

```typescript
// In api.ts client setup:
client.defaults.headers.common['Access-Control-Allow-Origin'] = '*'
```

---

## Testing

(To be added)

```bash
npm run test        # Run tests
npm run test:watch  # Watch mode
```

---

## Common Issues

### "Invalid credentials" on login
- Verify backend is running
- Check `VITE_API_URL` environment variable
- Ensure email/password match a test user in database

### Tokens not persisting
- Check browser localStorage is enabled
- Verify `public/index.html` loads correctly

### 401 Unauthorized on requests
- Check access token is being sent in `Authorization` header
- Verify token hasn't expired (30 min default)
- Try refreshing the page (forces token refresh)

### CORS errors
- Verify backend has CORS enabled
- Check API URL doesn't have trailing slash

---

## Future Enhancements

- [ ] Real-time updates (WebSocket)
- [ ] Offline mode with IndexedDB
- [ ] Multi-language support (i18n)
- [ ] Dark mode
- [ ] Biometric login (WebAuthn)
- [ ] End-to-end encryption for notes
- [ ] Video session integration (Zoom/Jitsi)

---

## Contributing

1. Create a branch for your feature
2. Make changes in `src/`
3. Test locally: `npm run dev`
4. Build for prod: `npm run build`
5. Submit PR with description

---

## License

Private - All rights reserved

---

## Support

For issues or questions:
1. Check this README
2. Review backend API docs
3. Check browser console for errors
4. Open GitHub issue with error details
