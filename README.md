<div align="center">

# TurnosControl

### Sistema de Gestión de Turnos y Nómina — Colombia 🇨🇴

Plataforma web completa para la programación de turnos laborales y liquidación de nómina,
construida sobre normativa colombiana (CST · Decreto 1072/2015 · Ley 2101/2021).

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.10-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## Tabla de Contenidos

- [Descripción](#-descripción)
- [Características](#-características)
- [Stack Tecnológico](#-stack-tecnológico)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Rutas de la Aplicación](#-rutas-de-la-aplicación)
- [API Endpoints](#-api-endpoints)
- [Prerrequisitos](#-prerrequisitos)
- [Instalación](#-instalación)
- [Variables de Entorno](#-variables-de-entorno)
- [Base de Datos](#-base-de-datos)
- [Credenciales Demo](#-credenciales-demo)
- [Scripts Disponibles](#-scripts-disponibles)
- [Motor de Cálculo Legal](#-motor-de-cálculo-legal)
- [Despliegue](#-despliegue)
- [Licencia](#-licencia)

---

## 📋 Descripción

**TurnosControl** es una aplicación SaaS multi-tenant para empresas colombianas que necesitan:

- Programar turnos laborales de sus empleados con un calendario visual interactivo
- Calcular la nómina automáticamente respetando la legislación colombiana
- Gestionar períodos de nómina con flujo completo: Borrador → Calculado → Cerrado
- Administrar auxiliares con acceso restringido a sus propios empleados
- Auditar todas las acciones realizadas en el sistema

El sistema implementa dos portales independientes:
- **Portal Administrador** — acceso completo a todos los módulos
- **Portal Auxiliar** — acceso restringido solo a los empleados que el auxiliar creó

---

## ✨ Características

| Módulo | Descripción |
|---|---|
| 🔐 **Autenticación dual** | JWT con NextAuth — roles Usuario (admin) y Auxiliar separados |
| 👥 **Empleados** | CRUD completo con tipos de contrato, vinculación, salario, centro de costo |
| 📅 **Turnos** | Calendario semanal con turnos predefinidos, novedades y horario manual libre |
| 🧮 **Nómina** | Períodos con cálculo automático de horas ordinarias, nocturnas, festivas y extras |
| 📊 **Resultados** | Vista detallada de liquidación por empleado con 8 categorías de horas |
| 🧑‍💼 **Auxiliares** | Gestión de auxiliares con acceso segregado por empleado creado |
| 🏢 **Multi-tenant** | Cada empresa tiene sus datos completamente aislados |
| 📋 **Auditoría** | Registro de acciones con actor, fecha, entidad y cambios |
| ⚙️ **Configuración legal** | Parámetros ajustables: tope semanal, recargos, festivos Colombia 2025-2026 |
| 📱 **Responsive** | Diseño mobile-first con shadcn/ui + Tailwind CSS |

---

## 🛠️ Stack Tecnológico

### Frontend

| Tecnología | Versión | Uso |
|---|---|---|
| [Next.js](https://nextjs.org/) | 14.2 | Framework React con App Router |
| [TypeScript](https://www.typescriptlang.org/) | 5.3 | Tipado estático |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4 | Estilos utilitarios |
| [shadcn/ui](https://ui.shadcn.com/) | — | Componentes UI accesibles (Radix UI) |
| [Lucide React](https://lucide.dev/) | 0.309 | Iconografía |
| [Sonner](https://sonner.emilkowal.ski/) | 1.3 | Toast notifications |
| [Recharts](https://recharts.org/) | 2.10 | Gráficas y reportes |
| [React Hook Form](https://react-hook-form.com/) | 7.49 | Formularios |
| [Zod](https://zod.dev/) | 3.22 | Validación de esquemas |

### Backend

| Tecnología | Versión | Uso |
|---|---|---|
| [Next.js API Routes](https://nextjs.org/) | 14.2 | Endpoints REST |
| [Prisma ORM](https://www.prisma.io/) | 5.10 | Acceso a base de datos |
| [PostgreSQL](https://www.postgresql.org/) | 16 | Base de datos relacional |
| [NextAuth.js](https://next-auth.js.org/) | 5.0-beta | Autenticación y sesiones JWT |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | 2.4 | Hash de contraseñas |
| [BullMQ](https://bullmq.io/) | 5.0 | Cola de tareas asíncronas |
| [ioredis](https://github.com/redis/ioredis) | 5.3 | Cliente Redis |

---

## 📁 Estructura del Proyecto

```
TurnosControl/
├── prisma/
│   ├── schema.prisma              # Modelos de base de datos
│   ├── seed.ts                    # Datos iniciales de demostración
│   └── migrations/                # Historial de migraciones SQL
│
├── src/
│   ├── app/
│   │   ├── (auth)/                # Grupo: rutas de autenticación
│   │   │   ├── login/             # Login Administrador
│   │   │   ├── login-auxiliar/    # Login Auxiliar
│   │   │   └── register/          # Registro de empresa
│   │   │
│   │   ├── dashboard/             # Panel Administrador
│   │   │   ├── page.tsx           # Inicio / métricas generales
│   │   │   ├── employees/         # Gestión de empleados (CRUD)
│   │   │   ├── schedules/         # Programación de turnos
│   │   │   ├── payroll/           # Nómina y períodos
│   │   │   ├── auxiliares/        # Gestión de auxiliares
│   │   │   ├── auditoria/         # Registro de auditoría
│   │   │   └── settings/          # Configuración (empresa, conceptos, legal)
│   │   │
│   │   ├── dashboard-auxiliar/    # Panel Auxiliar (acceso restringido)
│   │   │   ├── page.tsx           # Inicio auxiliar
│   │   │   ├── empleados/         # Solo empleados del auxiliar logueado
│   │   │   ├── programacion/      # Turnos de sus empleados
│   │   │   └── periodos/          # Períodos de sus empleados
│   │   │
│   │   ├── api/                   # REST API (Route Handlers)
│   │   │   ├── auth/              # NextAuth + registro
│   │   │   ├── employees/         # CRUD empleados
│   │   │   ├── auxiliares/        # CRUD auxiliares + auditoría
│   │   │   ├── concepts/          # Conceptos de nómina (admin)
│   │   │   ├── schedules/         # Turnos: GET + batch PUT
│   │   │   ├── payroll/           # Períodos, cálculo, resultados, conceptos
│   │   │   ├── settings/          # Empresa y configuración legal
│   │   │   └── auditoria/         # Registros de auditoría
│   │   │
│   │   ├── page.tsx               # Landing page principal
│   │   ├── layout.tsx             # Layout raíz con providers
│   │   └── globals.css            # Estilos globales
│   │
│   ├── components/
│   │   ├── ui/                    # Componentes shadcn/ui
│   │   └── layout/                # Sidebar, Header, SessionGuard (admin y auxiliar)
│   │
│   ├── lib/
│   │   ├── auth.ts                # Configuración NextAuth (dual-role)
│   │   ├── prisma.ts              # Cliente Prisma singleton
│   │   ├── auditoria.ts           # Helper para registrar auditoría
│   │   ├── queue.ts               # Cola BullMQ
│   │   └── utils.ts               # Utilidades compartidas
│   │
│   ├── services/
│   │   └── calculation.service.ts # Motor de cálculo de nómina CST
│   │
│   └── middleware.ts              # Protección de rutas por rol (admin / auxiliar)
│
├── .gitignore
├── .env.local                     # Variables de entorno (NO commitear)
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 🗺️ Rutas de la Aplicación

### Públicas

| Ruta | Descripción |
|---|---|
| `/` | Landing page — presentación del sistema |
| `/login` | Inicio de sesión Administrador |
| `/login-auxiliar` | Inicio de sesión Auxiliar |
| `/register` | Registro de nueva empresa |

### Panel Administrador (`/dashboard/*`)

| Ruta | Descripción |
|---|---|
| `/dashboard` | Métricas generales |
| `/dashboard/employees` | Lista de empleados con búsqueda y filtros |
| `/dashboard/employees/new` | Crear empleado |
| `/dashboard/employees/[id]` | Detalle de empleado |
| `/dashboard/employees/[id]/edit` | Editar empleado |
| `/dashboard/schedules` | Programación de turnos (calendario semanal por rango) |
| `/dashboard/payroll/periods` | Lista de períodos de nómina |
| `/dashboard/payroll/periods/[id]` | Detalle de período — empleados y progreso |
| `/dashboard/payroll/results` | Resultados de liquidación |
| `/dashboard/auxiliares` | Lista de auxiliares |
| `/dashboard/auxiliares/new` | Crear auxiliar |
| `/dashboard/auxiliares/[id]` | Detalle de auxiliar |
| `/dashboard/auxiliares/[id]/edit` | Editar auxiliar |
| `/dashboard/auditoria` | Historial de acciones del sistema |
| `/dashboard/settings` | Configuración general |
| `/dashboard/settings/concepts` | Conceptos de nómina (turnos y novedades) |
| `/dashboard/settings/legal` | Parámetros legales (recargos, horas) |
| `/dashboard/settings/company` | Datos de la empresa |

### Panel Auxiliar (`/dashboard-auxiliar/*`)

| Ruta | Descripción |
|---|---|
| `/dashboard-auxiliar` | Inicio del auxiliar |
| `/dashboard-auxiliar/empleados` | Solo empleados creados por este auxiliar |
| `/dashboard-auxiliar/empleados/new` | Crear empleado |
| `/dashboard-auxiliar/empleados/[id]` | Detalle de empleado |
| `/dashboard-auxiliar/empleados/[id]/edit` | Editar empleado |
| `/dashboard-auxiliar/programacion` | Programar turnos (idéntica lógica al admin) |
| `/dashboard-auxiliar/periodos` | Períodos de nómina de sus empleados |
| `/dashboard-auxiliar/periodos/[id]` | Detalle de período |

---

## 🔌 API Endpoints

### Autenticación

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/[...nextauth]` | Login / logout (NextAuth) |
| `POST` | `/api/auth/register` | Registro de empresa |

### Empleados

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/employees` | Listar empleados (`?soloMios=true` para auxiliar) |
| `POST` | `/api/employees` | Crear empleado |
| `GET` | `/api/employees/[id]` | Obtener empleado |
| `PUT` | `/api/employees/[id]` | Actualizar empleado |
| `DELETE` | `/api/employees/[id]` | Eliminar empleado |

### Auxiliares

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/auxiliares` | Listar auxiliares |
| `POST` | `/api/auxiliares` | Crear auxiliar |
| `GET` | `/api/auxiliares/[id]` | Obtener auxiliar |
| `PUT` | `/api/auxiliares/[id]` | Actualizar auxiliar |
| `DELETE` | `/api/auxiliares/[id]` | Desactivar auxiliar |
| `GET` | `/api/auxiliares/[id]/auditoria` | Auditoría del auxiliar (paginada) |

### Conceptos de Nómina

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/concepts` | Listar conceptos (admin — editable) |
| `POST` | `/api/concepts` | Crear concepto |
| `PUT` | `/api/concepts/[id]` | Actualizar concepto |
| `DELETE` | `/api/concepts/[id]` | Eliminar concepto |
| `GET` | `/api/payroll/concepts` | Listar conceptos (auxiliar — solo lectura) |

### Turnos

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/schedules` | Obtener turnos (`?empleadoId=&startDate=&endDate=`) |
| `PUT` | `/api/schedules/batch` | Guardar y/o eliminar turnos en lote (upsert) |

### Períodos de Nómina

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/payroll/periods` | Listar períodos |
| `POST` | `/api/payroll/periods` | Crear período |
| `GET` | `/api/payroll/periods/[id]` | Detalle de período |
| `DELETE` | `/api/payroll/periods/[id]` | Eliminar período |
| `GET` | `/api/payroll/periods/[id]/employees` | Empleados del período con sus turnos |
| `DELETE` | `/api/payroll/periods/[id]/employees/[empId]` | Quitar empleado del período |
| `POST` | `/api/payroll/periods/[id]/calculate` | Iniciar cálculo de nómina |
| `POST` | `/api/payroll/periods/[id]/confirm` | Confirmar y cerrar período |
| `GET` | `/api/payroll/results` | Resultados de liquidación (`?periodoId=`) |

### Configuración

| Método | Ruta | Descripción |
|---|---|---|
| `GET / PUT` | `/api/settings/company` | Datos de empresa |
| `GET / PUT` | `/api/settings/legal` | Parámetros legales |

### Auditoría

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/auditoria` | Registros de auditoría paginados |

---

## 💻 Prerrequisitos

Antes de instalar asegúrate de tener:

| Herramienta | Versión mínima | Link |
|---|---|---|
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| PostgreSQL | 14+ | [postgresql.org](https://www.postgresql.org/download/) |
| Git | cualquiera | [git-scm.com](https://git-scm.com/) |

> **Opcional:** Redis para procesamiento asíncrono con BullMQ. Sin Redis la app funciona en modo síncrono.

---

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/Alejostone1/TurnosControl.git
cd TurnosControl
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
# Crear el archivo de variables de entorno
# En Linux/Mac:
cp .env.example .env.local

# En Windows (PowerShell):
Copy-Item .env.example .env.local
```

Edita `.env.local` con tus credenciales (ver [Variables de Entorno](#-variables-de-entorno)).

### 4. Configurar la base de datos

```bash
# Aplica el schema y crea las tablas
npx prisma migrate dev

# Puebla la BD con datos de demostración
npm run db:seed
```

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre **http://localhost:3000** en tu navegador.

---

## 🔑 Variables de Entorno

Crea el archivo `.env.local` en la raíz del proyecto con el siguiente contenido:

```env
# ── Base de Datos ──────────────────────────────────────────────
# Formato: postgresql://USUARIO:PASSWORD@HOST:PUERTO/NOMBRE_DB
DATABASE_URL="postgresql://postgres:tu_password@localhost:5432/turnoscontrol"

# ── NextAuth ───────────────────────────────────────────────────
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="pega-aqui-un-secreto-largo-y-aleatorio"

# ── Redis (opcional) ───────────────────────────────────────────
# Solo necesario si usas BullMQ para procesamiento asíncrono
REDIS_URL="redis://localhost:6379"
```

**Generar `NEXTAUTH_SECRET`:**

```bash
# Linux/Mac (terminal):
openssl rand -base64 32

# Windows (PowerShell):
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

**Configurar PostgreSQL localmente:**

```sql
-- Conectado como superusuario (psql):
CREATE DATABASE turnoscontrol;
CREATE USER turnosuser WITH PASSWORD 'mi_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE turnoscontrol TO turnosuser;
```

---

## 🗄️ Base de Datos

### Modelos Principales

| Modelo | Descripción |
|---|---|
| `Empresa` | Tenant raíz — todos los datos pertenecen a una empresa |
| `Usuario` | Administradores de la empresa |
| `Auxiliar` | Usuarios con acceso restringido a sus empleados |
| `Empleado` | Trabajadores gestionados por la empresa |
| `ConceptoNomina` | Turnos y novedades configurables (Día, Noche, 24H, etc.) |
| `AsignacionTurno` | Relación empleado ↔ concepto ↔ fecha |
| `PeriodoNomina` | Período de liquidación con estado |
| `ResultadoLiquidacion` | Cálculo final por empleado y período |
| `RegistroAuditoria` | Log de todas las acciones del sistema |
| `ConfiguracionLegal` | Parámetros legales por empresa |

### Flujo de Estado del Período de Nómina

```
BORRADOR ──► PENDIENTE ──► CALCULADO ──► CERRADO
 (crear)     (calcular)   (resultados)  (confirmar)
```

### Comandos útiles de Prisma

```bash
npx prisma studio           # Explorador visual de la BD en el navegador
npx prisma migrate dev      # Crear y aplicar nueva migración
npx prisma db push          # Sincronizar schema sin historial (solo dev)
npx prisma generate         # Regenerar el cliente Prisma
npm run db:seed             # Poblar con datos de demostración
```

---

## 👤 Credenciales Demo

Después de ejecutar `npm run db:seed`:

### Administrador
```
URL:        http://localhost:3000/login
Correo:     admin@demo.com
Contraseña: admin123
```

### Auxiliar
```
URL:        http://localhost:3000/login-auxiliar
Correo:     auxiliar1@demo.com
Contraseña: auxiliar123
```

---

## 📜 Scripts Disponibles

```bash
# Desarrollo
npm run dev           # Servidor de desarrollo con hot reload en :3000

# Producción
npm run build         # Build optimizado para producción
npm run start         # Inicia el servidor de producción (requiere build previo)

# Calidad de código
npm run lint          # Análisis estático con ESLint

# Base de datos
npm run db:push       # Aplicar schema sin historial de migración
npm run db:migrate    # Crear y aplicar migración con historial completo
npm run db:seed       # Poblar la BD con datos de demostración
npm run db:studio     # Abrir Prisma Studio (explorador visual)
```

---

## ⚖️ Motor de Cálculo Legal

El motor implementa la normativa colombiana vigente para el cálculo automático de nómina:

### Jornada Laboral (Art. 161 CST · Ley 2101/2021)
- Tope semanal configurable (por defecto **44 horas**)
- Cálculo **minuto a minuto** para máxima precisión
- Detección automática de déficit y exceso semanal

### Clasificación de Horas (8 categorías)

| Tipo | Horario | Recargo |
|---|---|---|
| Ordinaria diurna | 06:00 – 21:00 (lunes a sábado) | 0% |
| Nocturna | 21:00 – 06:00 | +35% |
| Festiva diurna | Domingos y festivos (día) | +75% |
| Nocturna festiva | Domingos y festivos (noche) | +110% |
| Extra diurna | Sobre el tope semanal (día) | +25% |
| Extra nocturna | Sobre el tope semanal (noche) | +75% |
| Extra festiva diurna | Extras en festivo (día) | +100% |
| Extra festiva nocturna | Extras en festivo (noche) | +150% |

### Festivos Colombia 2025–2026
El sistema incluye el calendario oficial completo de festivos colombianos para 2025 y 2026.

### Auxilio de Transporte
Aplicado automáticamente cuando el salario base es ≤ 2 SMMLV según la configuración legal de la empresa.

---

## 🚢 Despliegue

### Vercel (Recomendado para producción)

1. Conecta el repositorio en [vercel.com](https://vercel.com)
2. Agrega las variables de entorno en el panel de Vercel:
   ```
   DATABASE_URL     → tu PostgreSQL en la nube
   NEXTAUTH_URL     → https://tu-dominio.vercel.app
   NEXTAUTH_SECRET  → secreto seguro generado
   ```
3. Vercel detecta Next.js automáticamente y despliega en cada push a `main`

### Bases de datos PostgreSQL en la nube (opciones gratuitas)

| Servicio | Tier Gratuito | Link |
|---|---|---|
| Neon | 0.5 GB, serverless | [neon.tech](https://neon.tech/) |
| Supabase | 500 MB | [supabase.com](https://supabase.com/) |
| Railway | 1 GB | [railway.app](https://railway.app/) |

### Pasos post-despliegue

```bash
# Aplicar migraciones en producción
npx prisma migrate deploy

# Poblar datos iniciales (opcional)
npm run db:seed
```

---

## 🤝 Contribución

1. Haz un **fork** del repositorio
2. Crea una rama descriptiva:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```
3. Commitea tus cambios con mensajes claros:
   ```bash
   git commit -m "feat: descripción breve del cambio"
   ```
4. Sube tu rama:
   ```bash
   git push origin feature/nueva-funcionalidad
   ```
5. Abre un **Pull Request** en GitHub describiendo qué cambiaste y por qué

---

## 📄 Licencia

Distribuido bajo la licencia **MIT**. Consulta el archivo `LICENSE` para más detalles.

---

<div align="center">

Construido con Next.js · Prisma · PostgreSQL · shadcn/ui

Para la gestión de nómina y turnos según la normativa laboral colombiana 🇨🇴

**[Reportar Bug](https://github.com/Alejostone1/TurnosControl/issues)** · **[Solicitar Feature](https://github.com/Alejostone1/TurnosControl/issues)**

</div>
