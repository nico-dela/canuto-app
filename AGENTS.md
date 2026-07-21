<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — Canuto

## Purpose

Este documento define los estándares de calidad obligatorios para cualquier código generado total o parcialmente por LLMs (ChatGPT, Copilot, Cursor, agentes autónomos, etc.) en **Canuto**.

Canuto es una PWA para descubrir eventos en Córdoba Capital (públicos vía scraping/organizadores; privados vía código). Stack:

- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4
- PWA con Serwist
- Supabase (Auth, Postgres, RLS) con fallback a **modo demo local** (`src/lib/events/local-store.ts`)
- MapLibre + OpenStreetMap
- Scrapers en `src/lib/scrapers/` y schema en `supabase/schema.sql`

El código generado por LLM **no se confía por defecto** y debe cumplir reglas de validación más estrictas.

---

# 1. Revisión humana obligatoria

1. Todo código generado por LLM DEBE ser revisado por un humano.
2. No se permite merge automático.
3. El revisor humano es responsable de:
   - Correctitud (filtros, RSVP, unlock, admin, scrapers)
   - Seguridad (Auth, RLS, secrets, códigos de acceso)
   - Performance (mapa, listados, scrapes)
   - Consistencia arquitectónica (capas y modo demo vs Supabase)
4. Si el autor no puede explicar el código generado, NO se mergea.

---

# 2. Cobertura de tests

Hoy el repo no tiene suite de tests; el código generado por LLM **debe introducir o extender tests** en el área tocada. No se acepta lógica de negocio nueva sin aserciones.

Umbrales mínimos (cuando exista runner de coverage en CI):

- Cobertura global: **≥ 90%**
- Branch coverage: **≥ 80%**
- Lógica de negocio crítica: **≥ 95%**

Priorizar tests en:

- `src/lib/events/filters.ts` — filtros de exploración
- `src/lib/scrapers/normalize.ts` — normalización de eventos scrapeados
- `src/lib/auth.ts` y rutas `/api/*` — auth, roles, unlock, RSVP, admin
- `src/lib/events/local-store.ts` — paridad con el comportamiento Supabase en demo
- Validación con Zod en inputs de API

Los tests DEBEN:

- Incluir aserciones significativas
- Cubrir edge cases, errores e inputs inválidos
- Evitar aserciones triviales solo para subir coverage

Código que baje la cobertura global DEBE rechazarse. Sin excepciones sin aprobación explícita.

---

# 3. Límites de complejidad ciclomática

Los LLMs suelen generar funciones demasiado complejas. Límites:

- Recomendado por función: ≤ 7
- Máximo permitido: 10
- > 10 exige refactor obligatorio antes del merge
- > 15 está estrictamente prohibido

Refactorizar dividiendo funciones, extrayendo helpers, aplanando conditionals anidados, o usando strategy/polimorfismo cuando aplique.

Atención especial en: scrapers (`run.ts`, fuentes), `ExploreClient`, handlers de API que ramifican demo vs Supabase, y moderación admin.

---

# 4. Seguridad

El código generado por LLM DEBE pasar validación de seguridad explícita.

Verificar:

- Sin credenciales, tokens ni keys hardcodeadas (usar `.env.local`; ver `.env.example`)
- Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` ni `SCRAPE_SECRET` al cliente
- Validación de input (Zod) en rutas API
- Protección frente a injection (SQL vía cliente Supabase; no concatenar SQL crudo)
- Auth/autorización: `getCurrentProfile`, rol `admin`, Bearer `SCRAPE_SECRET` en `/api/scrape`
- RLS y políticas en `supabase/schema.sql` coherentes con el acceso en código
- Códigos privados / unlock: no filtrar eventos privados sin unlock válido
- Errores seguros: no filtrar datos sensibles en logs ni respuestas
- Scrapers: no persistir PII innecesaria; respetar límites/ToS de fuentes (Instagram solo opt-in experimental vía `INSTAGRAM_SCRAPE_ENABLED`, no en el MVP automático)

Si las implicaciones de seguridad no están claras, el código DEBE rechazarse.

---

# 5. Cumplimiento arquitectónico

Capas del proyecto (respetar; no saltar límites):

| Capa | Ubicación | Rol |
|------|-----------|-----|
| UI / páginas | `src/app/**` | Rutas App Router, layouts, páginas |
| API | `src/app/api/**` | Route handlers |
| Componentes | `src/components/**` | UI reutilizable |
| Dominio / lib | `src/lib/**` | auth, events, scrapers, supabase, types, a11y |
| Edge | `src/middleware.ts` | Middleware Next |
| Persistencia SQL | `supabase/schema.sql` | Schema + RLS |

El código generado por LLM DEBE:

- Respetar estas capas y el path alias `@/`
- Mantener paridad **demo local ↔ Supabase** cuando se toque persistencia (`isSupabaseConfigured` / `localStore`)
- No introducir dependencias circulares
- No bypassear límites de dominio (p. ej. scrapers no escriben UI; UI no habla con service role)
- No añadir frameworks/librerías innecesarias
- No duplicar lógica existente (`filters`, `normalize`, clients Supabase en `src/lib/supabase/`)
- Leer la guía en `node_modules/next/dist/docs/` antes de APIs nuevas de Next

Si el output del LLM choca con la arquitectura, DEBE reescribirse.

---

# 6. Política de dependencias

El código generado por LLM NO DEBE:

- Añadir dependencias externas sin justificación
- Subir major versions automáticamente (`next`, `react`, `@supabase/*`, `maplibre-gl`, etc.)
- Introducir librerías sin mantenimiento

Toda dependencia nueva requiere aprobación humana. Preferir lo ya en `package.json` (Zod, date-fns, cheerio, MapLibre, Serwist, Supabase).

---

# 7. Calidad de código

El código generado DEBE:

- Ser legible y mantenible; nombres descriptivos
- Evitar dead code e imports sin uso
- Seguir formato/lint del proyecto (`npm run lint`, ESLint + `eslint-config-next`)
- Tipar con TypeScript; reutilizar tipos en `src/lib/types.ts` y `src/lib/constants.ts`
- Pasar `npm run build` cuando el cambio afecte runtime/PWA/SW
- Preservar accesibilidad existente (`A11yProvider`, `AccessibilityPanel`, `src/lib/a11y.ts`)

NO DEBE:

- Dejar bloques grandes comentados
- Incluir TODO/placeholder en paths de producción
- Añadir optimizaciones especulativas
- Romper el modo demo sin `.env` (la app debe seguir funcionando en local)

---

# 8. Performance

El código generado DEBE:

- Evitar ineficiencias obvias, N+1 y loops innecesarios
- Cuidar el mapa (MapLibre): no re-renderizar de más ni recargar estilo sin necesidad
- En listados/filtros, filtrar en lib/API de forma acotada; no hidratar datasets enormes en el cliente sin paginación/límites cuando escale
- En scrapers: fallos por fuente no deben tumbar el job completo (registrar error y continuar)
- Evitar allocations excesivas en normalización/parseo HTML

Código sensible a performance DEBE medirse si aplica.

---

# 9. Trazabilidad

Los PRs con código asistido por LLM DEBERÍAN:

- Declarar asistencia de LLM
- Incluir el prompt si no es trivial
- Describir validación hecha (`lint`, `build`, pruebas manuales de explorar/unlock/admin/scrape, demo vs Supabase)

Se fomenta la transparencia.

---

# 10. Enforcement en CI

Cuando exista CI, DEBE:

- Fallar si la coverage baja de los umbrales
- Fallar si se exceden límites de complejidad
- Fallar en errores de lint (`npm run lint`)
- Fallar en hallazgos de security scanner
- Fallar si `npm run build` no completa

Hasta que CI esté cableado, el autor/revisor DEBE correr al menos `npm run lint` y `npm run build` antes del merge. No se permite bypassear protecciones de CI.

---

# 11. Modelo de responsabilidad

Los LLMs son herramientas de productividad.

No son:

- Tomadores de decisión autónomos
- Autoridad arquitectónica
- Auditores de seguridad
- Expertos de performance

La responsabilidad final es siempre de ingenieros humanos.

---

# 12. Principio guía

Velocidad sin calidad aumenta el costo a largo plazo.

El código generado por LLM solo es aceptable cuando:

- Mejora la productividad
- Mantiene la integridad del sistema (demo + Supabase, PWA, RLS, scrapers)
- No introduce deuda técnica
- Cumple o supera el estándar de ingeniería manual

---

# Notas rápidas para agentes

- Sin `.env.local` de Supabase → modo demo; no asumir DB remota.
- Admin demo: `admin@canuto.local`; código privado de prueba: `AMIGOS26`.
- Scrapers: cultura municipal (prioridad); provincia puede 403 — no fallar el job entero.
- Instagram no entra en el MVP automático; scraper experimental opt-in (`INSTAGRAM_SCRAPE_ENABLED`) con eventos `pending` para moderación.
- Cambios de schema → actualizar `supabase/schema.sql` y documentar en el PR.
- UI y copy orientados a español (Córdoba Capital).
