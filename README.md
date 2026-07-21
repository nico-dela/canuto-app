# Canuto

PWA para descubrir eventos en **Córdoba Capital**: públicos (scraping + organizadores) y privados (código).

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- PWA con Serwist
- Supabase (Auth, Postgres, RLS) — opcional; sin `.env` corre en **modo local demo**
- MapLibre + OpenStreetMap

## Arranque rápido

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

### Demo local

- Explorar sin cuenta
- Código privado de prueba: `AMIGOS26`
- Admin: registrate/entrar con `admin@canuto.local` (cualquier contraseña) → `/admin`

## Supabase

1. Creá un proyecto en Supabase
2. Corré [`supabase/schema.sql`](supabase/schema.sql) en el SQL editor
3. Copiá `.env.example` → `.env.local` y completá las keys
4. Reiniciá `npm run dev`

## Scrapers

Fuentes actuales (Córdoba Capital):

- https://cultura.cordoba.gob.ar/agenda/ (prioridad; scrapeable)
- https://cultura.cba.gov.ar/eventos/ (puede devolver 403 desde algunos IPs/CloudFront; el job no falla: registra el error y sigue)
- https://www.eventbrite.com.ar/d/argentina--córdoba/events/
- https://www.meetup.com/find/?location=ar--cordoba&source=EVENTS
- https://feverup.com/es/cordoba-argentina (experiencias / conciertos)

Fuera del scrape automático por defecto: Passline (anti-bot / queue), Facebook Events.

**Instagram (experimental, opt-in):** agendas culturales en flyers de perfiles públicos. Activá con `INSTAGRAM_SCRAPE_ENABLED=true`, perfiles en `INSTAGRAM_PROFILES`, y opcionalmente `INSTAGRAM_SESSIONID` (cookie de sesión propia; Instagram suele bloquear anónimo). Corre OCR (`tesseract.js`) sobre las imágenes, parsea candidatos y los upserta como `pending` para revisión en `/admin`. Fragil y contra ToS de Instagram — no usar en cron sin supervisión.

```bash
# desde la UI admin, o:
./scripts/trigger-scrape.sh
# (requiere SCRAPE_SECRET en .env.local)

# CLI in-process (útil con Supabase; en demo la memoria no es la del `next dev`):
npm run scrape
```

### Cron automático (cada 6 h)

**Vercel:** [`vercel.json`](vercel.json) dispara `GET /api/scrape` cada 6 horas. En el proyecto de Vercel definí `SCRAPE_SECRET` y `CRON_SECRET` con el **mismo** valor (Vercel Cron manda `Authorization: Bearer $CRON_SECRET`).

- Plan **Pro**: el schedule `0 */6 * * *` aplica.
- Plan **Hobby**: solo 1 cron/día — cambiá el schedule a `0 15 * * *` (15:00 UTC ≈ mediodía AR) o upgradé.

**Local** (app corriendo con `npm run dev` o `npm start`):

```bash
chmod +x scripts/trigger-scrape.sh
# crontab -e  → cada 6 horas:
0 */6 * * * cd /ruta/a/canuto-app && ./scripts/trigger-scrape.sh >> /tmp/canuto-scrape.log 2>&1
```

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Desarrollo |
| `npm run build` | Build producción (+ SW) |
| `npm run start` | Servir build |
| `npm run scrape` | Correr scrapers por CLI |
| `npm run scrape:trigger` | POST a `/api/scrape` (server local/remoto) |
| `npm run lint` | ESLint |
| `npm test` | Tests (node:test) |

## Pantallas

- `/` — Explorar (mapa + lista + filtros + “¿Qué hacemos ahora?”)
- `/events/[id]` — Detalle + RSVP
- `/unlock` — Código privado
- `/auth` — Login/registro
- `/create` — Crear evento
- `/my` — Mis eventos
- `/admin` — Moderación + scrapers
