# PJ 5404

PJ 5404 plays and keeps track of my progress through a playlist of all of Pearl Jam's live albums on Spotify. It includes an integration with Spotify's Web Playback SDK and a redis layer for persistance.


## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **State Management**: MobX
- **Styling**: Tailwind CSS
- **Database**: Upstash Redis
- **External APIs**: Spotify Auth & Web Playback SDK

## Getting Started

1. Clone the repository and install dependencies:

```bash
yarn install
```

2. Set up environment variables (copy `.env.example` to `.env.local`):

```bash
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
PLAYLIST_ID=your_spotify_playlist_id
```

3. Run the development server:

```bash
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) and log in with Spotify

## Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
│   ├── api/          # API endpoints (auth, token management)
│   ├── actions.ts    # Server actions
│   └── page.tsx      # Main UI
├── components/       # React components
│   └── Player.tsx    # Spotify Web Playback player
├── stores/           # MobX state management
│   ├── PlayerStore.ts
│   └── ProgressStore.ts
└── lib/              # Utilities and helpers
    ├── spotify.ts    # Spotify API client
    ├── kv.ts         # Upstash Redis client
    └── schemas.ts    # Zod validation schemas
```
