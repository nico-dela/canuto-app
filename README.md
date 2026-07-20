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

Fuera del scrape automático por ahora: Instagram (ToS/API), Passline (anti-bot / queue), Facebook Events.

```bash
# desde la UI admin, o:
curl -X POST http://localhost:3000/api/scrape
# (requiere sesión admin o header Authorization: Bearer $SCRAPE_SECRET)

npm run scrape
```

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Desarrollo |
| `npm run build` | Build producción (+ SW) |
| `npm run start` | Servir build |
| `npm run scrape` | Correr scrapers por CLI |
| `npm run lint` | ESLint |

## Pantallas

- `/` — Explorar (mapa + lista + filtros + “¿Qué hacemos ahora?”)
- `/events/[id]` — Detalle + RSVP
- `/unlock` — Código privado
- `/auth` — Login/registro
- `/create` — Crear evento
- `/my` — Mis eventos
- `/admin` — Moderación + scrapers
