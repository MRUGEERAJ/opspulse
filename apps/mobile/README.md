# OpsPulse Field Mobile App

This package contains the bare React Native FieldAgent shell.

## Current Shell

- Development-only in-memory login.
- Jobs, Offline Queue, and Profile tabs.
- Typed Job Detail route.
- Shared API health contract.
- Manual API health retry.
- `API_URL` through `react-native-config`.

Real authentication, token storage, assigned-job loading, offline persistence,
camera, location, QR scanning, and synchronization are intentionally deferred.

## iOS Setup

From the repository root:

```bash
pnpm install
cp apps/mobile/.env.example apps/mobile/.env
pnpm --filter @opspulse/shared build

cd apps/mobile
bundle install
bundle exec pod install --project-directory=ios
cd ../..

pnpm --filter @opspulse/mobile ios
```

The default iOS simulator API URL is `http://127.0.0.1:3000`.

## Other API Hosts

- Android emulator: `http://10.0.2.2:3000`
- Physical device: use the development machine's reachable LAN address.

React Native native requests do not use browser CORS. They still fail when the
API host is not reachable from the simulator or device.

## Development Login

The displayed login is deliberately explicit:

- No real authentication exists yet.
- Session state is stored only in React memory.
- Restarting the app logs the user out.
