"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Clock,
  Users,
  BarChart2,
  ShieldCheck,
  Calendar,
  FileText,
  CheckCircle2,
  ArrowRight,
  Building2,
  UserCog,
  Scale,
  BookOpen,
  Calculator,
  Award,
  ChevronDown,
} from "lucide-react"

const features = [
  {
    icon: Clock,
    title: "Control de Jornada Laboral",
    desc: "Gestión de la jornada ordinaria de 47 horas semanales (Ley 2101 de 2021) con registro de horas extras diurnas y nocturnas.",
    ref: "CST Art. 160–162",
    color: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    icon: Calendar,
    title: "Programación de Turnos",
    desc: "Asignación visual de turnos por empleado con control de festivos colombianos, domingos y jornadas especiales.",
    ref: "CST Art. 171–175",
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  {
    icon: Calculator,
    title: "Liquidación de Nómina",
    desc: "Cálculo automático de salario ordinario, recargos nocturnos (35%), dominicales y festivos (75%) según el CST.",
    ref: "CST Art. 168–170",
    color: "bg-purple-50 text-purple-600 border-purple-100",
  },
  {
    icon: Users,
    title: "Gestión de Empleados",
    desc: "Registro completo con tipo de contrato, vinculación, centro de costo, programa y modalidad de trabajo.",
    ref: "Decreto 1072/2015",
    color: "bg-orange-50 text-orange-600 border-orange-100",
  },
  {
    icon: ShieldCheck,
    title: "Auditoría y Trazabilidad",
    desc: "Historial completo de todas las acciones realizadas por administradores y auxiliares sobre el sistema.",
    ref: "Circular 001/2022",
    color: "bg-red-50 text-red-600 border-red-100",
  },
  {
    icon: BarChart2,
    title: "Reportes y Exportación",
    desc: "Reportes de nómina, turnos programados y resultados de liquidación exportables para presentación ante entidades.",
    ref: "DIAN / MinTrabajo",
    color: "bg-cyan-50 text-cyan-600 border-cyan-100",
  },
]

const normas = [
  {
    icon: BookOpen,
    titulo: "Código Sustantivo del Trabajo",
    items: [
      "Jornada máxima: 47 horas semanales (Ley 2101/2021)",
      "Recargo nocturno: 35% sobre salario ordinario",
      "Horas extra diurnas: 25% — Nocturnas: 75%",
      "Dominicales y festivos: 75% adicional",
    ],
  },
  {
    icon: Scale,
    titulo: "Decreto 1072 de 2015",
    items: [
      "Reglamentación del Sector Trabajo",
      "Afiliaciones al Sistema de Seguridad Social",
      "Aportes a salud, pensión y ARL",
      "Parafiscales: SENA, ICBF, Caja Compensación",
    ],
  },
  {
    icon: Award,
    titulo: "Prestaciones Sociales",
    items: [
      "Prima de servicios: 15 días por semestre",
      "Cesantías: 1 mes de salario por año",
      "Vacaciones: 15 días hábiles por año",
      "Auxilio de transporte según decreto anual",
    ],
  },
]

const stats = [
  { label: "Normas aplicadas", value: "12+", sub: "CST y decretos vigentes" },
  { label: "Tipos de recargo", value: "8", sub: "Diurnos, nocturnos, festivos" },
  { label: "Módulos integrados", value: "6", sub: "Turnos, nómina, reportes" },
  { label: "Roles de acceso", value: "2", sub: "Administrador y Auxiliar" },
]

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Navbar ────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-900">TurnosPro</span>
              <span className="hidden sm:inline text-xs text-gray-500 ml-2">Sistema de Gestión</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
            >
              Administrador
            </Link>
            <Link
              href="/login-auxiliar"
              className="px-4 py-1.5 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Portal Auxiliar
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-500/20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left — Text */}
            <div className={`space-y-8 transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white text-xs font-semibold px-4 py-2 rounded-full backdrop-blur-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                Cumplimiento normativa colombiana
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
                  Gestión de
                  <span className="block text-emerald-300">Turnos y Nómina</span>
                  con Normativa
                  <span className="block text-yellow-300">Colombiana</span>
                </h1>
                <p className="text-lg text-blue-100 leading-relaxed max-w-lg">
                  Sistema integral que automatiza la programación de turnos, el cálculo de recargos nocturnos,
                  horas extras y la liquidación de nómina según el <strong className="text-white">Código Sustantivo
                  del Trabajo</strong> y el <strong className="text-white">Decreto 1072 de 2015</strong>.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/login"
                  className="group flex items-center justify-center gap-2 bg-white text-blue-700 font-bold px-8 py-4 rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <Building2 className="w-5 h-5" />
                  Acceso Administrador
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/login-auxiliar"
                  className="group flex items-center justify-center gap-2 bg-emerald-500 text-white font-bold px-8 py-4 rounded-xl hover:bg-emerald-400 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <UserCog className="w-5 h-5" />
                  Portal Auxiliar
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Right — Stats cards */}
            <div className={`grid grid-cols-2 gap-4 transition-all duration-1000 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              {stats.map(s => (
                <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-center">
                  <p className="text-4xl font-extrabold text-white">{s.value}</p>
                  <p className="text-sm font-semibold text-white mt-1">{s.label}</p>
                  <p className="text-xs text-blue-200 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 animate-bounce">
          <ChevronDown className="w-6 h-6" />
        </div>
      </section>

      {/* ── Normativa colombiana ───────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-4 py-2 rounded-full mb-4">
              <Scale className="w-3.5 h-3.5" />
              Marco Normativo
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              100% alineado con la legislación laboral
              <span className="block text-blue-600">colombiana vigente</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Cada cálculo, cada recargo y cada liquidación sigue estrictamente las normas del Ministerio del Trabajo
              y la Corte Suprema de Justicia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {normas.map(n => (
              <div key={n.titulo} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                    <n.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">{n.titulo}</h3>
                </div>
                <ul className="space-y-2">
                  {n.items.map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Referencia de jornada */}
          <div className="mt-8 bg-blue-600 rounded-2xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl font-bold mb-1">Ley 2101 de 2021 — Reducción Progresiva de Jornada</h3>
              <p className="text-blue-100">
                A partir de 2023 se inició la reducción progresiva de la jornada laboral máxima en Colombia,
                pasando de 48 a <strong>44 horas semanales</strong>, con miras a llegar a <strong>42 horas</strong> en 2026.
                TurnosPro calcula automáticamente los umbrales correctos según el año vigente.
              </p>
            </div>
            <div className="text-center shrink-0">
              <p className="text-4xl font-extrabold">44h</p>
              <p className="text-blue-200 text-xs">Max. semanal 2026</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Funcionalidades ───────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-xs font-semibold px-4 py-2 rounded-full mb-4">
              <BarChart2 className="w-3.5 h-3.5" />
              Módulos del Sistema
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Todo lo que necesitas en
              <span className="text-blue-600"> un solo sistema</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Desde la programación de turnos hasta la liquidación final de nómina,
              con trazabilidad y cumplimiento normativo en cada paso.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <div
                key={f.title}
                className="group border border-gray-100 rounded-2xl p-6 hover:shadow-lg transition-all hover:-translate-y-1 bg-white"
              >
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">{f.desc}</p>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                  <FileText className="w-3 h-3" />
                  {f.ref}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Accesos ───────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Elige tu tipo de acceso
            </h2>
            <p className="text-gray-600 text-lg">
              Dos roles, dos portales. Cada uno con las herramientas exactas que necesita.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Admin */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-blue-100 hover:shadow-2xl transition-shadow">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 text-white">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                  <Building2 className="w-9 h-9 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Administrador</h3>
                <p className="text-blue-100 text-sm leading-relaxed">
                  Gestión completa del sistema: empleados, auxiliares, períodos de nómina,
                  configuración de conceptos y auditoría general.
                </p>
              </div>
              <div className="p-6 space-y-3">
                {[
                  "Gestión de empleados y auxiliares",
                  "Configuración de conceptos de nómina",
                  "Períodos y liquidación de nómina",
                  "Reportes y auditoría completa",
                  "Configuración de empresa y parámetros legales",
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                    {item}
                  </div>
                ))}
                <Link
                  href="/login"
                  className="mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors w-full"
                >
                  Ingresar como Administrador
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Auxiliar */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-emerald-100 hover:shadow-2xl transition-shadow">
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 text-white">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                  <UserCog className="w-9 h-9 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Auxiliar</h3>
                <p className="text-emerald-100 text-sm leading-relaxed">
                  Portal operativo para auxiliares: registro de empleados, programación de
                  turnos y consulta de períodos de nómina.
                </p>
              </div>
              <div className="p-6 space-y-3">
                {[
                  "Registro y edición de empleados",
                  "Programación de turnos mensual",
                  "Consulta de períodos de nómina",
                  "Vista de turnos por empleado",
                  "Acceso restringido a su área de gestión",
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {item}
                  </div>
                ))}
                <Link
                  href="/login-auxiliar"
                  className="mt-4 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors w-full"
                >
                  Ingresar como Auxiliar
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-lg">TurnosPro</p>
                <p className="text-gray-400 text-xs">Sistema de Gestión de Turnos y Nómina</p>
              </div>
            </div>

            <div className="text-center text-sm text-gray-400">
              <p>Cumplimiento normativo según el <span className="text-gray-300">Código Sustantivo del Trabajo</span></p>
              <p className="mt-1">Decreto 1072 de 2015 · Ley 2101 de 2021 · Ministerio del Trabajo</p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/login"
                className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              >
                Admin
              </Link>
              <Link
                href="/login-auxiliar"
                className="px-5 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
              >
                Auxiliar
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
            © {new Date().getFullYear()} TurnosPro · Todos los derechos reservados ·
            Desarrollado para empresas colombianas
          </div>
        </div>
      </footer>

    </div>
  )
}
