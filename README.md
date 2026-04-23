# Kragujevac Sport

Sportske vesti iz Kragujevca – frontend (HTML/CSS/JS) + Vercel serverless API + Supabase (baza + storage).

Radio: [Lotify Studio](https://lotifystudio.com)

## Funkcionalnosti

- Javna lista vesti sa kategorijom, galerijom slika i bočnim reklamnim banerima (levo/desno, rotacija 60 s / broj reklama).
- Pojedinačna strana vesti sa galerijom slika i lightbox-om.
- Admin panel (skriven od indeksiranja):
  - Prijava sa korisničkim imenom i lozinkom (env).
  - Dodavanje i izmena vesti (CRUD).
  - Upload više slika iz galerije / sa uređaja (kompresija na klijentu), izbor glavne slike.
  - Uvoz sa Instagrama (oEmbed + OG fallback).
  - Upravljanje reklamama (više klijenata po poziciji, aktivacija/pauziranje).
- SEO: meta, Open Graph, Twitter Cards, JSON-LD (`NewsMediaOrganization`, `WebSite`, `NewsArticle`, `ItemList`), dinamički `sitemap.xml`, `robots.txt`, canonical URL-ovi.
- Dark / light tema (persist u localStorage).

## Stack

- Frontend: statički HTML/CSS/JS u `public/`
- Backend: Vercel Node serverless funkcije u `api/`
- Baza i Storage: Supabase (Postgres + Storage bucket `media`)
- Auth: JWT (HS256)

## Lokalno pokretanje

```bash
npm install
cp .env.example .env.local
# popuni .env.local
npx vercel dev
```

Frontend je server-renderless (čist statik). Za potpunu funkcionalnost potreban je Vercel dev server koji pokreće `/api/*` funkcije.

## Potrebne env varijable (Vercel → Project → Settings → Environment Variables)

| Ime | Opis |
|---|---|
| `SUPABASE_URL` | URL Supabase projekta |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role key (nikad nemoj izložiti na klijentu) |
| `JWT_SECRET` | Dugačka random string za potpisivanje admin tokena |
| `ADMIN_USERNAME` | Admin login username |
| `ADMIN_PASSWORD` | Admin login lozinka |
| `SITE_URL` | (opcionalno) kanonski URL sajta, npr. `https://kragujevacsport.com` — koristi se u sitemap-u |

## Struktura baze

Tabele (public schema):
- `news (id, title, description, image_url, gallery jsonb, category, instagram_post_id, instagram_post_url, created_at)`
- `ads (id, client_name, position ∈ {left,right}, image_url, link_url, active, sort_order, created_at)`

Storage bucket `media` (javno čitljiv). API koristi service role ključ za upload.

RLS:
- `news`: javni READ (svi), WRITE samo preko service role.
- `ads`: javni READ samo aktivnih, WRITE samo preko service role.

## Deploy na Vercel

1. Poveži repo na Vercel (Framework: Other).
2. Dodaj env varijable (vidi tabelu gore).
3. Deploy. `public/` je output, `api/*.js` su serverless funkcije.
4. Dodaj custom domain (npr. `kragujevacsport.com`) u Vercel → Domains.
5. Submituj sitemap na Google Search Console i Bing Webmaster Tools.

## Ruting

- `/` → `public/index.html`
- `/vest.html?id=123` → detalj vesti
- `/vest/123` → rewrite na `vest.html` (čitljiv SEO URL)
- `/admin-panel.html` → admin (noindex)
- `/sitemap.xml` → generisan iz `/api/sitemap`
- `/robots.txt` → statik
- `/api/login` → POST login
- `/api/create` → POST nova vest (auth)
- `/api/news` → GET sve (auth) — za admin
- `/api/news/[id]` → GET (javno) / PUT / DELETE (auth)
- `/api/upload` → POST base64 upload (auth)
- `/api/ads` → GET lista (public = aktivne, auth = sve) / POST nova (auth)
- `/api/ads/[id]` → PUT / DELETE (auth)
- `/api/instagram` → POST uvoz objave (auth)

## Sigurnost

- Admin panel je označen `X-Robots-Tag: noindex, nofollow` i `<meta name="robots" content="noindex">`.
- Service role key se nikad ne šalje na klijent — koristi se samo u serverless funkcijama.
- Promeni `ADMIN_PASSWORD` i `JWT_SECRET` na produkciji. Nemoj commit-ovati `.env.local`.
