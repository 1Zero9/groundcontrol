# Ground Control

Your family's shared mission control — a calendar, sticky-note board, and
optional plug-in modules (Sports, School, Life, Bills & Renewals) for
household-specific event types. One login per household, with individual
member profiles inside.

## Documentation

- [Technical documentation](docs/TECHNICAL.md) — architecture, data model,
  auth, environment setup, and build history
- [User guide](docs/USER_GUIDE.md) — how to sign up, navigate the app, add
  events/tasks/notes, switch profiles, and manage modules

## Quick start

```bash
npm install
npx vercel env pull .env.local --yes   # pull DATABASE_URL / SESSION_SECRET etc.
npm run db:migrate
npm run db:seed
npm run dev
```

See [docs/TECHNICAL.md](docs/TECHNICAL.md) for the full list of scripts and
required environment variables.
