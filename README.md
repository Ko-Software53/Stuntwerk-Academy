# Edutain Academy

Schulungsplattform für Mitarbeiter.

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Supabase (Auth, Database, Edge Functions)

## Development

```sh
npm install
npm run dev
```

## Environment

- **Local dev**: create a `.env` in the project root (this file is gitignored).
- **Production (Netlify)**: add the same variables under **Site settings → Environment variables**.

### Required (Vite frontend)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Note: Vite only exposes variables prefixed with `VITE_` to the browser.

### Supabase Edge Function secrets (not Netlify)

These are read inside Supabase Edge Functions via `Deno.env.get(...)` and must be configured in Supabase:

```sh
supabase secrets set --project-ref <project-ref> \
  RESEND_API_KEY=... \
  RESEND_FROM_EMAIL="Stuntwerk Academy <academy@stuntwerk.de>" \
  PUBLIC_APP_URL=https://academy.stuntwerk.de
```

## Build

```sh
npm run build
```
# Stuntwerk-Academy
