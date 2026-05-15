# Guía de Despliegue — Vercel + Neon

Sigue estos pasos en orden. Toda la configuración ya quedó preparada en el repo:
`vercel.json`, `package.json` con `vercel-build`, `next.config.js` con orígenes
dinámicos y `.env.production.example` como plantilla de variables.

---

## 1. Obtener `DATABASE_URL` desde Neon

1. Entra a tu proyecto: <https://console.neon.tech/app/projects/shiny-wave-84221272>
2. En la barra lateral, ve a **Dashboard** o **Connection Details**.
3. En el selector **"Connection string"** elige:
   - **Database:** `neondb` (la que viene por defecto, o crea una nueva)
   - **Role:** `neondb_owner`
   - **Pooled connection:** ✅ **ACTÍVALO** (importante para serverless)
4. Copia el string. Tendrá esta forma:

   ```
   postgresql://neondb_owner:XXXXXXXX@ep-xxxxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

5. **Habilita la extensión `citext`** (el schema la requiere). Abre la pestaña
   **SQL Editor** en Neon y ejecuta:

   ```sql
   CREATE EXTENSION IF NOT EXISTS citext;
   ```

---

## 2. Generar `NEXTAUTH_SECRET`

Abre una terminal y corre:

```bash
openssl rand -base64 32
```

Si estás en Windows sin OpenSSL, usa Node:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Guarda ese valor. Lo usarás también para `AUTH_SECRET` y `JWT_SECRET`.

---

## 3. Conectar el repo en Vercel

1. Ve a <https://vercel.com/alejostones-projects>.
2. Click en **Add New… → Project**.
3. Elige **Import Git Repository** y selecciona `Alejostone1/TurnosControl`.
   - Si no aparece, conecta tu cuenta de GitHub primero.
4. En la pantalla de configuración:
   - **Framework Preset:** Next.js (se detecta solo).
   - **Build Command:** déjalo en blanco — `vercel.json` ya define
     `prisma generate && prisma migrate deploy && next build`.
   - **Root Directory:** `./` (raíz).
5. **NO hagas Deploy todavía.** Antes, agrega las variables de entorno.

---

## 4. Variables de entorno en Vercel

En la misma pantalla de importación, despliega **Environment Variables** y agrega:

| Nombre | Valor | Entornos |
|---|---|---|
| `DATABASE_URL` | Connection string de Neon (paso 1) | Production, Preview |
| `NEXTAUTH_URL` | `https://tu-app.vercel.app` (Vercel te dará la URL final, edítala luego) | Production |
| `NEXTAUTH_SECRET` | El valor del paso 2 | Production, Preview |
| `AUTH_SECRET` | Mismo valor que `NEXTAUTH_SECRET` | Production, Preview |
| `AUTH_URL` | `https://tu-app.vercel.app` | Production |
| `APP_URL` | `https://tu-app.vercel.app` | Production |
| `JWT_SECRET` | Otro valor `openssl rand -base64 32` | Production, Preview |
| `JWT_REFRESH_SECRET` | Otro valor `openssl rand -base64 32` | Production, Preview |
| `JWT_EXPIRES_IN` | `15m` | Production, Preview |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Production, Preview |
| `BCRYPT_ROUNDS` | `12` | Production, Preview |
| `APP_NAME` | `Sistema Calculo Turnos` | Production, Preview |
| `CORS_ORIGIN` | `https://tu-app.vercel.app` | Production |
| `CORS_CREDENTIALS` | `true` | Production, Preview |

> Después del primer deploy, Vercel te da la URL real. Vuelve a esta pantalla
> y reemplaza `tu-app.vercel.app` por la URL real, luego redeploya.

---

## 5. Deploy

Click en **Deploy**.

Vercel hará:

1. `npm install` → como definimos `postinstall: prisma generate`,
   el cliente Prisma se genera automáticamente.
2. `prisma migrate deploy` → aplica las migraciones contra Neon.
3. `next build` → compila la app.

El primer build tarda ~3–5 minutos. Si falla, mira los logs y revisa:
- ¿`DATABASE_URL` apunta a Neon (no a localhost)?
- ¿Está habilitada la extensión `citext` en Neon?
- ¿`NEXTAUTH_SECRET` tiene al menos 32 caracteres?

---

## 6. Después del primer deploy

### a) Ajustar URLs de NextAuth
Si la URL real es distinta a `tu-app.vercel.app` (por ejemplo
`turnos-control-xyz123.vercel.app`), actualiza estas variables y redeploya:
- `NEXTAUTH_URL`
- `AUTH_URL`
- `APP_URL`
- `CORS_ORIGIN`

### b) (Opcional) Cargar datos iniciales con seed
Tu proyecto tiene `prisma/seed.ts`. Para correrlo contra Neon **una sola vez**,
desde tu máquina local:

```bash
# Exporta temporalmente la URL de Neon
export DATABASE_URL="postgresql://neondb_owner:...@ep-xxxxx-pooler...neon.tech/neondb?sslmode=require"

# Corre el seed
npm run db:seed
```

---

## 7. Notas importantes sobre tu stack

### ⚠️ Redis / BullMQ
El proyecto usa `bullmq` + `ioredis` para colas de cálculo de nómina.
**Vercel serverless NO incluye Redis.** Tienes dos opciones:

- **Sin Redis (modo síncrono):** El código lazy-carga BullMQ solo cuando se
  llama. Si no defines `REDIS_URL`, los endpoints que lo usen fallarán al
  intentar conectarse. Si tu flujo principal no encola nada, ignóralo.
- **Con Redis gestionado:** Usa [Upstash Redis](https://console.upstash.com)
  (free tier 10k commands/día). Crea una base, copia la URL `rediss://...`
  y agrégala como variable `REDIS_URL` en Vercel.

### ⚠️ Cron Jobs / Workers de larga duración
Vercel serverless tiene timeout de 10s (Hobby) / 60s (Pro). Si el cálculo de
nómina demora más, considera mover ese trabajador a Railway o Render.

### ⚠️ Token en git remote
Tu remote tiene un Personal Access Token de GitHub embebido. **Rótalo** en
<https://github.com/settings/tokens> y reemplázalo con:
```bash
git remote set-url origin https://github.com/Alejostone1/TurnosControl.git
```
GitHub te pedirá login al hacer push, o usa GitHub CLI (`gh auth login`).

---

## 8. Despliegues posteriores

A partir de aquí, cada `git push` a `master` dispara un deploy automático.
Las migraciones nuevas (`prisma migrate dev` en local → commit → push)
se aplican solas porque `vercel-build` corre `prisma migrate deploy` primero.

```bash
# Flujo de trabajo
npx prisma migrate dev --name nueva_feature
git add .
git commit -m "feat: nueva feature"
git push origin master
# Vercel detecta el push, corre migraciones, compila y publica.
```
