# Grouppix

Private event albums. Guests scan a QR, add a photo or a short video, and it hits the wall. No accounts. No public feed. The group id is the invite.

Live brand: **Grouppix** (`grouppix.vercel.app`). Repo name is still `crowdsnap`.

## What you get

- `/` — one-page site: how it works, who it is for, privacy, a one-time buy button, and a live create-group demo
- `/new` — name the night, get a short code and QR
- `/host/:id` — host card (QR, code, stand / wall / phone)
- `/stand/:id` — giant QR for a table or TV
- `/g/:id` — the wall (masonry, live poll, thumbnails first)
- `/g/:id/add` — guest phone: optional first name, camera or camera roll
- `/g/:id/booth` — shutter, Clear / Gel
- PWA: installable, app shell + viewed media cached for bad venue wifi

There is no login, no email list, and no directory of events. If you do not have the code, you see nothing useful.

## Group ids

Each group gets a short human code such as `CALM` (letters only, no `I` or `O`). It is shown as `C A L M` and lives in the URL as `/g/calm`.

Hand people the QR or the link on the stand. Knowing the code is the invite.

## One-time purchase

The marketing **Buy Grouppix** button uses:

```
VITE_PAYMENT_LINK=https://buy.stripe.com/placeholder
```

Paste your Stripe Payment Link, Lemon Squeezy, or Polar URL. Do not build custom checkout. One-time, not a subscription.

## Shared wall (two phones)

The old factory page could look like a group while staying on one device. This build is honest about that.

**Already in this repo:** Supabase groups + `memories` + the `trip-media` bucket. If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set (they are on the current Vercel site), create / wall / upload go through Supabase. Two phones with the same code see the same wall.

1. Create a Supabase project (or keep the existing one).
2. Run `supabase/schema.sql`.
3. Create a public storage bucket named `trip-media` (or set `VITE_SUPABASE_BUCKET`).
4. Set the two `VITE_` keys on Vercel.

**Optional, Vercel-native:** set `BLOB_READ_WRITE_TOKEN` on Vercel. `/api` then stores group JSON and media in Vercel Blob. Guests upload straight to Blob (not through the 4.5 MB serverless body limit).

**Local demo:** with no shared env, create + QR + wall + upload still work on that browser via IndexedDB. The host card will say the group is on this device only. That is not a second-phone wall.

## Run

Needs Node 20+.

```
npm install
npm run dev
```

Open the printed local URL. Create a group on `/` or `/new`, open the stand, open the wall, add a photo.

```
npm run build
npm run preview
npm test
```

## Deploy on Vercel

1. Import `jmizzo29/crowdsnap`.
2. Framework: Vite. Output: `dist`.
3. Set `VITE_PAYMENT_LINK` to your payment URL.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or `BLOB_READ_WRITE_TOKEN`).
5. Deploy. Routes are client-side; `vercel.json` rewrites the SPA and leaves `/api` alone.

The previous GitHub Pages `base: /crowdsnap/` is gone. The site is meant to live at the domain root.

## Product rules this repo keeps

- No accounts, OAuth, passwords, or email login
- Photos and videos (videos are capped at 80 MB and never dropped silently)
- Photos are resized on the phone before upload
- Optional first name on upload; never required to view
- Warm copy for weddings, graduations, house parties, funerals, feast days — not a public social feed
