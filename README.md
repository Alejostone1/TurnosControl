<div align="center">

<br />

<img src="https://img.shields.io/badge/TurnosControl-Sistema%20de%20Nómina%20y%20Turnos-1e3a6e?style=for-the-badge&logoColor=white" alt="TurnosControl" height="40"/>

<br /><br />

**Plataforma SaaS multi-tenant para gestión de turnos laborales y liquidación de nómina**  
Construida sobre normativa colombiana vigente — CST · Decreto 1072/2015 · Ley 2101/2021 · Ley 2466/2025

<br />

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)

<br />

[**Documentación**](#-tabla-de-contenidos) · [**Instalación rápida**](#-instalación) · [**Demo**](#-credenciales-demo) · [**Reportar bug**](https://github.com/Alejostone1/TurnosControl/issues)

<br />

</div>

---

## Tabla de Contenidos

- [Descripción](#-descripción)
- [Módulos del Sistema](#-módulos-del-sistema)
- [Stack Tecnológico](#️-stack-tecnológico)
- [Arquitectura](#-arquitectura)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Rutas de la Aplicación](#️-rutas-de-la-aplicación)
- [API REST](#-api-rest)
- [Motor de Cálculo Legal](#️-motor-de-cálculo-legal)
- [Prerrequisitos](#-prerrequisitos)
- [Instalación](#-instalación)
- [Variables de Entorno](#-variables-de-entorno)
- [Base de Datos](#️-base-de-datos)
- [Credenciales Demo](#-credenciales-demo)
- [Scripts Disponibles](#-scripts-disponibles)
- [Despliegue](#-despliegue)
- [Licencia](#-licencia)

---

## Descripción

**TurnosControl** es una aplicación web empresarial diseñada para organizaciones colombianas que requieren control preciso sobre la programación de turnos y la liquidación de nómina. El sistema aplica automáticamente la normativa vigente del Código Sustantivo del Trabajo (CST), clasificando cada hora trabajada en su categoría legal correspondiente para calcular recargos y horas extras con exactitud de minuto a minuto.

### Portales independientes

| Portal | Acceso | Alcance |
|---|---|---|
| **Administrador** | `/login` | Control total — empleados, períodos, configuración, auditoría |
| **Auxiliar** | `/login-auxiliar` | Acceso restringido — únicamente a los empleados que el auxiliar creó |

### Flujo principal

```
Configurar empresa → Crear empleados → Programar turnos → Calcular período → Exportar reportes
```

---

## Módulos del Sistema

### Programación de Turnos

#### Vista Individual
Calendario interactivo por empleado con tres modos de visualización:

- **Vista Semanal** — cuadrícula de 7 columnas con barra de progreso de horas (44h/semana). Cada celda muestra el concepto, ícono y horas efectivas. Candado visual en turnos guardados con modal de confirmación **Editar / Eliminar**.
- **Vista Mensual** — calendario completo del mes, ideal para planificación a largo plazo. Celdas con color del concepto asignado.
- **Vista Diaria** — detalle completo de un día: tipo de día (laboral/festivo), turno actual, acumulado semanal y desglose de 8 categorías de horas calculadas en tiempo real.

**Picker de turno:**
- Dos columnas: Turnos de trabajo + Novedades/Permisos
- Horario manual (entrada y salida libres)
- Selector de descuento de alimentación por turno: Sin descuento / 30 min / 1 hora / Personalizado
- Resumen en tiempo real: *"12h programadas − 30min alimentación = 11.5h efectivas"*
- Advertencia cuando el día pertenece a un período ya calculado

#### Vista Masiva
Programación de múltiples empleados simultáneamente:

- Calendario interactivo con selección de fechas por rango o clic individual
- Chips por empleado con indicador de semanas programadas
- Vista de período cerrado para semanas ya guardadas
- Tabs de período para navegar entre semanas
- Aplicación automática del turno seleccionado al guardar
- Barra de progreso de horas por semana en tiempo real

#### Historial de Programación
- Acordeón por período con turnos asignados
- Filtro por período de nómina
- Vista compacta de todos los turnos históricos del empleado

---

### Períodos de Nómina

Ciclo de vida completo con máquina de estados:

```
BORRADOR ──► CALCULADO ──► APROBADO ──► CERRADO ──► ARCHIVADO
```

Cada período incluye:
- Configuración de descuento de alimentación global (aplica a todos los turnos del período como valor predeterminado)
- Asignación de empleados con progreso de horas por semana
- Cálculo automático de las 8 categorías de horas según CST
- Exportación Excel con resultados detallados
- Auditoría completa de cada cambio de estado

---

### Descuento de Alimentación

Sistema de tres niveles de prioridad para el descuento del tiempo de alimentación:

```
Turno individual  >  Período de nómina  >  Sin descuento (0 min)
```

- Configurable a nivel de período: Sin descuento / 30 min / 1 hora / Personalizado
- Override por turno individual desde el picker del calendario
- El descuento se aplica **antes** del cálculo de recargos y extras, reduciendo la ventana efectiva de trabajo minuto a minuto
- Indicador visual en celdas del calendario y badge en la barra del empleado
- `null` en la asignación = hereda del período; `0` = sin descuento explícito; `>0` = minutos concretos

---

### Conceptos de Nómina

Catálogo dinámico y configurable por empresa:

| Categoría | Ejemplos |
|---|---|
| `TURNO_LABORAL` | Turno Día (D), Turno Noche (N), Turno 24h (24T), Horario Libre (M) |
| `AUSENCIA_PAGA` | Incapacidad (I), Vacaciones (V), Permiso Remunerado (PR) |
| `AUSENCIA_NO_PAGA` | Sin Contrato (SC), Ausencia No Justificada (NJ) |
| `DESCANSO` | Compensatorio (C), Día Libre Festivo (DF) |

Cada concepto tiene: código, color, ícono, horario predeterminado, tipo de impacto (SUMA / RESTA / NEUTRO), horas fijas opcionales y cruce de medianoche configurable.

---

### Reportes y Exportación Excel

#### Horas Trabajadas por Día
Exportación con estructura multinivel profesional:

```
┌─────────────────────────────────────────────────────────────────┐
│ Fila 1: Título del reporte (celdas fusionadas, fondo oscuro)    │
│ Fila 2: Filtros aplicados                                       │
│ Fila 3: Espaciador                                              │
│ Fila 4: Grupos — [RECARGOS / teal] [HORAS EXTRAS / amber]      │
│ Fila 5: Códigos concepto — 010 011 012 013 | 045 046 047 048   │
│ Fila 6: Nombres de columna (colores por grupo)                  │
│ Fila 7+: Datos por empleado por día                             │
└─────────────────────────────────────────────────────────────────┘
```

Columnas de recargos (teal) y extras (amber) con colores distintos para identificación inmediata. Las primeras 6 filas quedan congeladas al desplazar.

#### Otros Reportes
- **Nómina por empleado** — valores monetarios, devengados y deducciones
- **Programación de turnos** — calendario exportado por período
- **Lista de empleados** — directorio con datos organizacionales

---

### Auditoría

Registro completo e inmutable de todas las acciones:

- Actor (usuario o auxiliar), fecha, módulo, entidad y cambios (`valorAntes` / `valorDespues`)
- Severidades: INFO / BAJO / MEDIO / ALTO / CRÍTICO
- Acciones masivas y automáticas marcadas como tal
- Alerta especial cuando se modifica un turno dentro de un período ya calculado
- Filtros por módulo, severidad, fecha y actor

---

### Configuración Legal

Parámetros completamente ajustables por empresa:

- Tope de horas semanales (por defecto 44h — Art. 161 CST)
- Porcentajes de recargo nocturno, festivo y nocturno-festivo
- Porcentajes de hora extra diurna, nocturna, festiva y nocturna-festiva
- Horario de inicio/fin de jornada nocturna (por defecto 21:00–06:00 según Ley 2466/2025)
- Tipo de cálculo de extras: SEMANAL (acumula 44h) o DIARIO (por jornada)
- Configuración de almuerzo: ninguno, duración fija o horario exacto

---

## ⚙️ Stack Tecnológico

### Frontend

| Tecnología | Versión | Rol |
|---|---|---|
| [Next.js](https://nextjs.org/) | 14.2 | Framework React — App Router, SSR, API Routes |
| [TypeScript](https://www.typescriptlang.org/) | 5.3 | Tipado estático end-to-end |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4 | Estilos utilitarios, diseño responsive |
| [shadcn/ui](https://ui.shadcn.com/) | — | Componentes UI accesibles basados en Radix UI |
| [Lucide React](https://lucide.dev/) | — | Biblioteca de íconos |
| [Sonner](https://sonner.emilkowal.ski/) | — | Notificaciones toast |
| [Zod](https://zod.dev/) | 3.22 | Validación de esquemas y formularios |

### Backend

| Tecnología | Versión | Rol |
|---|---|---|
| [Next.js API Routes](https://nextjs.org/) | 14.2 | Endpoints REST con `force-dynamic` |
| [Prisma ORM](https://www.prisma.io/) | 5.22 | Acceso tipado a PostgreSQL |
| [PostgreSQL](https://www.postgresql.org/) | 16 | Base de datos relacional con extensión `citext` |
| [NextAuth.js](https://next-auth.js.org/) | 4.x | Autenticación JWT — dos roles independientes |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | 2.4 | Hashing seguro de contraseñas |
| [ExcelJS](https://github.com/exceljs/exceljs) | — | Generación de reportes Excel con formato avanzado |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Browser)                           │
│           Next.js App Router — "use client" components              │
│    Calendario interactivo · Picker · Reportes · Auditoría           │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTP / fetch
┌──────────────────────────▼──────────────────────────────────────────┐
│                      SERVIDOR Next.js                               │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  Route Handlers │  │  NextAuth JWT    │  │  Middleware       │  │
│  │  /api/*         │  │  Dual-role auth  │  │  Protección rutas │  │
│  └────────┬────────┘  └──────────────────┘  └───────────────────┘  │
│           │                                                         │
│  ┌────────▼────────────────────────────────────────────────────┐   │
│  │              Motor de Cálculo Legal (CST)                   │   │
│  │  clasificación minuto a minuto · 8 categorías de horas      │   │
│  │  descuento alimentación · tope semanal configurable         │   │
│  └────────┬────────────────────────────────────────────────────┘   │
│           │                                                         │
│  ┌────────▼────────┐                                               │
│  │   Prisma ORM    │                                               │
│  └────────┬────────┘                                               │
└───────────┼─────────────────────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────────────────────┐
│                       PostgreSQL 16                                  │
│   Multi-tenant · empresaId en cada tabla · citext extension          │
│   12 modelos · auditoría completa · migraciones versionadas          │
└─────────────────────────────────────────────────────────────────────┘
```

### Aislamiento multi-tenant

Cada tabla incluye `empresaId` como campo de partición. El token JWT contiene `empresaId` y cada Route Handler lo valida en primera instancia antes de cualquier consulta a la base de datos. No existe posibilidad de acceso cruzado entre tenants.

---

## Estructura del Proyecto

```
TurnosControl/
│
├── prisma/
│   ├── schema.prisma                    # 12 modelos, enums, extensiones PostgreSQL
│   ├── seed.ts                          # Datos de demostración (empresa + 8 empleados)
│   └── migrations/
│       └── 20260515195720_init/         # Migración única — schema completo desde cero
│           └── migration.sql
│
├── src/
│   ├── app/
│   │   ├── (auth)/                      # Rutas públicas de autenticación
│   │   │   ├── login/                   # Login Administrador
│   │   │   ├── login-auxiliar/          # Login Auxiliar
│   │   │   └── register/               # Registro de nueva empresa
│   │   │
│   │   ├── dashboard/                   # Panel Administrador (protegido)
│   │   │   ├── page.tsx                 # Dashboard — métricas y accesos rápidos
│   │   │   ├── employees/               # CRUD completo de empleados
│   │   │   ├── schedules/
│   │   │   │   ├── individual/          # Calendario individual (semanal/mensual/diario)
│   │   │   │   ├── masiva/              # Programación masiva multi-empleado
│   │   │   │   └── historial/           # Historial de turnos por período
│   │   │   ├── payroll/
│   │   │   │   ├── periods/             # CRUD períodos + detalle + cálculo
│   │   │   │   └── results/             # Resultados de liquidación por empleado
│   │   │   ├── reports/                 # Centro de reportes y exportación Excel
│   │   │   ├── auxiliares/              # CRUD de auxiliares
│   │   │   ├── auditoria/               # Registro de auditoría con filtros
│   │   │   └── settings/
│   │   │       ├── concepts/            # Conceptos de nómina (turnos y novedades)
│   │   │       ├── legal/               # Parámetros legales CST
│   │   │       └── company/             # Datos de la empresa
│   │   │
│   │   ├── dashboard-auxiliar/          # Panel Auxiliar (acceso segregado)
│   │   │   ├── empleados/               # Solo empleados del auxiliar logueado
│   │   │   ├── programacion/            # Turnos de sus empleados
│   │   │   └── periodos/                # Períodos y resultados de sus empleados
│   │   │
│   │   └── api/                         # Route Handlers REST
│   │       ├── auth/                    # NextAuth + registro empresa
│   │       ├── employees/               # CRUD + bulk + template Excel
│   │       ├── auxiliares/              # CRUD + auditoría por auxiliar
│   │       ├── concepts/                # Conceptos de nómina (admin)
│   │       ├── schedules/               # GET turnos + PUT batch + exportar
│   │       ├── payroll/
│   │       │   ├── periods/             # CRUD + calcular + confirmar + reset
│   │       │   ├── concepts/            # Conceptos (auxiliar — solo lectura)
│   │       │   ├── results/             # Resultados consolidados
│   │       │   └── export/              # Exportación Excel de nómina
│   │       ├── reports/
│   │       │   ├── horas/               # Excel Horas Trabajadas (multinivel)
│   │       │   ├── nomina/              # Excel Nómina
│   │       │   ├── turnos/              # Excel Programación
│   │       │   └── empleados/           # Excel Directorio
│   │       ├── settings/                # Empresa y configuración legal
│   │       └── auditoria/               # Registros de auditoría paginados
│   │
│   ├── components/
│   │   ├── ui/                          # Componentes shadcn/ui (Button, Card, Input…)
│   │   └── layout/
│   │       ├── Sidebar.tsx              # Navegación Administrador
│   │       ├── SidebarAuxiliar.tsx      # Navegación Auxiliar
│   │       ├── Header.tsx               # Barra superior con usuario activo
│   │       ├── SessionGuard.tsx         # Protección de rutas Admin
│   │       └── SessionGuardAuxiliar.tsx # Protección de rutas Auxiliar
│   │
│   ├── lib/
│   │   ├── auth.ts                      # Configuración NextAuth — dual role (Usuario + Auxiliar)
│   │   ├── prisma.ts                    # Cliente Prisma singleton (dev hot-reload safe)
│   │   ├── auditoria.ts                 # Helper registrarAuditoria()
│   │   └── utils.ts                     # Utilidades compartidas (cn, formatters)
│   │
│   ├── services/
│   │   └── calculation.service.ts       # Motor de cálculo CST — clasificación de horas
│   │
│   └── middleware.ts                    # Protección de rutas — redirige por rol
│
├── .env.example                         # Plantilla de variables de entorno
├── .gitignore
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
| `/` | Landing page |
| `/login` | Inicio de sesión Administrador |
| `/login-auxiliar` | Inicio de sesión Auxiliar |
| `/register` | Registro de nueva empresa |

### Panel Administrador `/dashboard/*`

| Ruta | Descripción |
|---|---|
| `/dashboard` | Métricas generales — empleados activos, períodos, horas |
| `/dashboard/employees` | Lista con búsqueda, filtros y exportación |
| `/dashboard/employees/new` | Crear empleado |
| `/dashboard/employees/[id]` | Detalle del empleado |
| `/dashboard/employees/[id]/edit` | Editar empleado |
| `/dashboard/schedules/individual` | Calendario individual (semanal / mensual / diario) |
| `/dashboard/schedules/masiva` | Programación masiva multi-empleado |
| `/dashboard/schedules/historial` | Historial de turnos por período |
| `/dashboard/payroll/periods` | Lista de períodos de nómina |
| `/dashboard/payroll/periods/[id]` | Detalle: empleados, progreso, descuento alimentación |
| `/dashboard/payroll/periods/[id]/edit` | Editar fechas del período |
| `/dashboard/payroll/results` | Resultados consolidados de liquidación |
| `/dashboard/reports` | Centro de reportes — descarga Excel por tipo |
| `/dashboard/auxiliares` | Lista de auxiliares |
| `/dashboard/auxiliares/new` | Crear auxiliar |
| `/dashboard/auxiliares/[id]` | Detalle y auditoría del auxiliar |
| `/dashboard/auxiliares/[id]/edit` | Editar auxiliar |
| `/dashboard/auditoria` | Historial completo de auditoría con filtros |
| `/dashboard/settings/concepts` | Conceptos de nómina — turnos y novedades |
| `/dashboard/settings/legal` | Parámetros legales CST |
| `/dashboard/settings/company` | Datos de la empresa |

### Panel Auxiliar `/dashboard-auxiliar/*`

| Ruta | Descripción |
|---|---|
| `/dashboard-auxiliar` | Inicio del auxiliar |
| `/dashboard-auxiliar/empleados` | Solo empleados creados por este auxiliar |
| `/dashboard-auxiliar/empleados/new` | Crear empleado |
| `/dashboard-auxiliar/empleados/[id]` | Detalle del empleado |
| `/dashboard-auxiliar/empleados/[id]/edit` | Editar empleado |
| `/dashboard-auxiliar/programacion` | Turnos de sus empleados |
| `/dashboard-auxiliar/periodos` | Períodos de sus empleados |
| `/dashboard-auxiliar/periodos/[id]` | Detalle de período |
| `/dashboard-auxiliar/periodos/resultados` | Resultados de liquidación |

---

## API REST

### Autenticación

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/auth/[...nextauth]` | Login / logout con NextAuth |
| `POST` | `/api/auth/register` | Registro de empresa nueva |

### Empleados

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/employees` | Listar empleados (`?soloMios=true` para auxiliar) |
| `POST` | `/api/employees` | Crear empleado |
| `GET` | `/api/employees/[id]` | Obtener empleado |
| `PUT` | `/api/employees/[id]` | Actualizar empleado |
| `DELETE` | `/api/employees/[id]` | Eliminar empleado |
| `POST` | `/api/employees/bulk` | Importación masiva desde Excel |
| `GET` | `/api/employees/template` | Descargar plantilla Excel para importación |

### Auxiliares

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/auxiliares` | Listar auxiliares |
| `POST` | `/api/auxiliares` | Crear auxiliar |
| `GET` | `/api/auxiliares/[id]` | Obtener auxiliar |
| `PUT` | `/api/auxiliares/[id]` | Actualizar auxiliar |
| `DELETE` | `/api/auxiliares/[id]` | Desactivar auxiliar |
| `GET` | `/api/auxiliares/[id]/auditoria` | Auditoría del auxiliar (paginada) |

### Conceptos de Nómina

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/concepts` | Listar conceptos (Admin — editable) |
| `POST` | `/api/concepts` | Crear concepto |
| `PUT` | `/api/concepts/[id]` | Actualizar concepto |
| `DELETE` | `/api/concepts/[id]` | Eliminar concepto |
| `GET` | `/api/payroll/concepts` | Listar conceptos (Auxiliar — solo lectura) |

### Turnos

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/schedules` | Turnos por empleado y rango de fechas |
| `PUT` | `/api/schedules/batch` | Guardar/eliminar turnos en lote con `minutosAlimentacion` |
| `GET` | `/api/schedules/export` | Exportar programación a Excel |

### Períodos de Nómina

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/payroll/periods` | Listar períodos (`?estados=CALCULADO,CERRADO`) |
| `POST` | `/api/payroll/periods` | Crear período |
| `GET` | `/api/payroll/periods/[id]` | Detalle del período con `minutosAlimentacion` |
| `PUT` | `/api/payroll/periods/[id]` | Actualizar período (fechas solo en BORRADOR) |
| `DELETE` | `/api/payroll/periods/[id]` | Eliminar período (solo BORRADOR) |
| `GET` | `/api/payroll/periods/[id]/employees` | Empleados del período con progreso de horas |
| `POST` | `/api/payroll/periods/[id]/employees` | Asignar empleado al período |
| `PUT/DELETE` | `/api/payroll/periods/[id]/employees/[empId]` | Actualizar / quitar empleado |
| `POST` | `/api/payroll/periods/[id]/calculate` | Ejecutar cálculo de nómina |
| `POST` | `/api/payroll/periods/[id]/confirm` | Confirmar y cerrar período |
| `POST` | `/api/payroll/periods/[id]/reset` | Resetear a BORRADOR |
| `GET` | `/api/payroll/results` | Resultados consolidados por período |
| `GET` | `/api/payroll/export` | Exportar resultados a Excel |

### Reportes

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/reports/horas` | Excel Horas Trabajadas por día (header multinivel) |
| `GET` | `/api/reports/nomina` | Excel Nómina consolidada |
| `GET` | `/api/reports/turnos` | Excel Programación de turnos |
| `GET` | `/api/reports/empleados` | Excel Directorio de empleados |

### Configuración y Auditoría

| Método | Endpoint | Descripción |
|---|---|---|
| `GET / PUT` | `/api/settings/company` | Datos de la empresa |
| `GET / PUT` | `/api/settings/legal` | Parámetros legales (recargos, horas) |
| `GET` | `/api/auditoria` | Registros de auditoría paginados y filtrados |

---

## ⚖️ Motor de Cálculo Legal

El motor implementa el **Código Sustantivo del Trabajo** colombiano con precisión de un minuto. Clasifica cada minuto trabajado en una de 8 categorías según la hora del día, el tipo de día y el acumulado semanal del empleado.

### Clasificación de horas (8 categorías)

| # | Categoría | Concepto nómina | Recargo | Condición |
|---|---|---|---|---|
| 1 | Ordinaria | `010` | 0% | Día laboral, 06:00–21:00, dentro del tope semanal |
| 2 | Nocturna | `011` | +35% | 21:00–06:00, dentro del tope semanal |
| 3 | Festiva diurna | `012` | +75% | Domingo o festivo, 06:00–21:00, dentro del tope |
| 4 | Nocturna festiva | `013` | +110% | Domingo o festivo, 21:00–06:00, dentro del tope |
| 5 | Extra diurna | `045` | +25% | Sobre el tope semanal, 06:00–21:00 |
| 6 | Extra nocturna | `046` | +75% | Sobre el tope semanal, 21:00–06:00 |
| 7 | Extra festiva diurna | `047` | +100% | Sobre el tope, domingo/festivo, día |
| 8 | Extra nocturna festiva | `048` | +150% | Sobre el tope, domingo/festivo, noche |

### Parámetros del cálculo

- **Tope semanal:** configurable por empresa (por defecto 44h — Art. 161 CST · Ley 2101/2021)
- **Jornada nocturna:** 21:00–06:00 (Ley 2466/2025)
- **Tipo de cálculo de extras:** SEMANAL (acumulado de 44h) o DIARIO (por jornada estándar)
- **Descuento de alimentación:** se sustrae del tiempo efectivo **antes** del cálculo minuto a minuto
- **Festivos:** calendario oficial Colombia 2025–2026 incorporado en el sistema

### Descuento de alimentación — Lógica de prioridad

```
Asignación individual (minutosAlimentacion IS NOT NULL)
    ↓ si null
Período de nómina (minutosAlimentacion IS NOT NULL)
    ↓ si null
Sin descuento (0 minutos)
```

El descuento se aplica acortando el extremo final de la ventana de trabajo, lo que garantiza que el tiempo de alimentación no genere recargos ni extras en ningún escenario.

### Festivos Colombia incluidos

El sistema incorpora todos los festivos legales colombianos para 2025 y 2026, incluyendo los días de puente calculados según la Ley 51 de 1983. Los domingos son tratados automáticamente como días con recargo festivo.

---

## Prerrequisitos

| Herramienta | Versión mínima | Enlace |
|---|---|---|
| Node.js | 18 LTS | [nodejs.org](https://nodejs.org/) |
| PostgreSQL | 14+ | [postgresql.org](https://www.postgresql.org/download/) |
| Git | cualquiera | [git-scm.com](https://git-scm.com/) |
| npm | 9+ | incluido con Node.js |

---

## Instalación

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
# Linux / macOS
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

Edita el archivo `.env` con tus credenciales (ver [Variables de Entorno](#-variables-de-entorno)).

### 4. Crear la base de datos PostgreSQL

```sql
-- Conectado como superusuario (psql o pgAdmin):
CREATE DATABASE turnos_db;
CREATE USER turnos_user WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE turnos_db TO turnos_user;
```

### 5. Aplicar la migración y cargar datos de demostración

```bash
# Crear todas las tablas desde la migración inicial
npx prisma migrate deploy

# Poblar con datos de demostración
npx prisma db seed
```

### 6. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre **http://localhost:3000** en tu navegador.

---

## Variables de Entorno

Crea el archivo `.env` en la raíz con el siguiente contenido:

```env
# ── Base de Datos ──────────────────────────────────────────────────────────
# Formato: postgresql://USUARIO:PASSWORD@HOST:PUERTO/NOMBRE_DB
DATABASE_URL="postgresql://turnos_user:tu_password@localhost:5432/turnos_db"

# ── NextAuth ───────────────────────────────────────────────────────────────
# URL pública de la aplicación
NEXTAUTH_URL="http://localhost:3000"

# Secreto de 32+ caracteres — NUNCA expongas este valor
NEXTAUTH_SECRET="genera-un-secreto-largo-y-aleatorio-aqui"
```

**Generar `NEXTAUTH_SECRET`:**

```bash
# Linux / macOS
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# Node.js (cualquier plataforma)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🗄️ Base de Datos

### Modelos

| Modelo | Descripción |
|---|---|
| `Empresa` | Tenant raíz — todos los datos pertenecen a una empresa |
| `Usuario` | Administradores con roles: SUPER_ADMIN, ADMINISTRADOR, LIQUIDADOR, VISUALIZADOR |
| `Auxiliar` | Usuarios con acceso restringido a sus propios empleados |
| `Sesion` / `SesionAuxiliar` | Sesiones JWT activas por tipo de usuario |
| `ConfiguracionLegal` | Parámetros CST por empresa (recargos, jornada, extras) |
| `ConceptoNomina` | Catálogo dinámico de turnos y novedades |
| `Empleado` | Trabajadores con datos laborales y de contrato |
| `ConfiguracionEmpleado` | Overrides personalizados por empleado |
| `EmpleadoPeriodo` | Asignación de empleados a períodos específicos |
| `AsignacionTurno` | Turno asignado a empleado en fecha: concepto + novedad + `minutosAlimentacion` |
| `PeriodoNomina` | Período de liquidación con estado y `minutosAlimentacion` global |
| `RegistroDiaTrabajado` | Resultado calculado día a día con las 8 categorías de horas |
| `ResultadoNomina` | Totales consolidados y valores monetarios por período |
| `RegistroAuditoria` | Log inmutable de todas las acciones del sistema |
| `TrabajoCalculo` | Cola de trabajos para cálculos asíncronos |

### Flujo de estados del período

```
BORRADOR ──► CALCULADO ──► APROBADO ──► CERRADO ──► ARCHIVADO
  (editar)   (calcular)   (revisar)   (confirmar)  (historial)
```

> Los períodos en estado **CALCULADO**, **APROBADO** o **CERRADO** muestran advertencia de auditoría al editar turnos.

### Comandos Prisma útiles

```bash
npx prisma studio              # Explorador visual de la BD en el navegador
npx prisma migrate dev         # Crear y aplicar nueva migración en desarrollo
npx prisma migrate deploy      # Aplicar migraciones en producción (sin interacción)
npx prisma migrate reset       # Resetear BD completa + reaplicar migraciones + seed
npx prisma generate            # Regenerar el cliente Prisma (tras cambios en schema)
npx prisma db seed             # Poblar con datos de demostración
```

---

## Credenciales Demo

Después de ejecutar `npx prisma db seed`:

```
╔══════════════════════════════════════════════════════════╗
║              CREDENCIALES DE ACCESO                      ║
╠══════════════════════════════════════════════════════════╣
║  SUPER_ADMIN   admin@demo.com          admin123          ║
║  LIQUIDADOR    liquidador@demo.com     liquidador123     ║
║  VISUALIZADOR  visor@demo.com          visor123          ║
║  AUXILIAR 1    auxiliar1@demo.com      auxiliar123       ║
║  AUXILIAR 2    auxiliar2@demo.com      auxiliar456       ║
╠══════════════════════════════════════════════════════════╣
║  Empresa: Empresa Demo S.A.S.   NIT: 900123456-7         ║
║  8 empleados en 3 centros de costo                       ║
║  Período abril/2026  → CERRADO  (datos calculados)       ║
║  Período mayo/2026   → BORRADOR (días 1–13 cargados)     ║
╚══════════════════════════════════════════════════════════╝
```

| Portal | URL |
|---|---|
| Administrador | `http://localhost:3000/login` |
| Auxiliar | `http://localhost:3000/login-auxiliar` |

---

## Scripts Disponibles

```bash
# Desarrollo
npm run dev            # Servidor de desarrollo con hot-reload en :3000

# Producción
npm run build          # Build optimizado de Next.js
npm run start          # Servidor de producción (requiere build previo)

# Calidad de código
npm run lint           # Análisis estático con ESLint

# Base de datos
npm run db:push        # Sincronizar schema sin historial de migración (dev rápido)
npm run db:migrate     # Crear y aplicar migración con historial completo
npm run db:seed        # Poblar la BD con datos de demostración
npm run db:studio      # Abrir Prisma Studio (explorador visual en :5555)
```

---

## Despliegue

### Vercel + Neon (recomendado)

1. Crea una base de datos gratuita en [neon.tech](https://neon.tech/) y copia la `DATABASE_URL`
2. Conecta el repositorio en [vercel.com](https://vercel.com)
3. Configura las variables de entorno en Vercel:
   ```
   DATABASE_URL    → tu connection string de Neon
   NEXTAUTH_URL    → https://tu-app.vercel.app
   NEXTAUTH_SECRET → secreto de 32+ caracteres
   ```
4. En el panel de Vercel, agrega este comando de build:
   ```bash
   npx prisma migrate deploy && next build
   ```

### Bases de datos PostgreSQL en la nube

| Servicio | Tier gratuito | Ideal para |
|---|---|---|
| [Neon](https://neon.tech/) | 0.5 GB, serverless, autoscale | Producción serverless |
| [Supabase](https://supabase.com/) | 500 MB, API REST incluida | Proyectos con Auth propio |
| [Railway](https://railway.app/) | 1 GB, fácil de configurar | Startups y MVPs |
| [Render](https://render.com/) | 1 GB, PostgreSQL managed | Despliegue todo-en-uno |

### Pasos post-despliegue

```bash
# Aplicar migraciones en producción sin interacción
npx prisma migrate deploy

# Cargar datos iniciales (solo una vez, opcional)
npx prisma db seed
```

---

## Licencia

Distribuido bajo la licencia **MIT**. Consulta el archivo `LICENSE` para más detalles.

---

<div align="center">

<br />

Construido con **Next.js** · **Prisma** · **PostgreSQL** · **shadcn/ui** · **ExcelJS**

Para la gestión de nómina y turnos según la normativa laboral colombiana 🇨🇴

<br />

**[Reportar Bug](https://github.com/Alejostone1/TurnosControl/issues)** · **[Solicitar Feature](https://github.com/Alejostone1/TurnosControl/issues)** · **[GitHub](https://github.com/Alejostone1/TurnosControl)**

<br />

</div>
