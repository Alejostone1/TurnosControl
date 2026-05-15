"use client"

import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Scale, BookOpen, Building2, ArrowRight } from "lucide-react"

const sections = [
  {
    href: "/dashboard/settings/company",
    icon: Building2,
    iconColor: "text-orange-500",
    title: "Datos de la Empresa",
    description:
      "Información básica, datos de contacto y configuración general de la empresa. Gestiona NIT, dirección y estado.",
  },
  {
    href: "/dashboard/settings/legal",
    icon: Scale,
    iconColor: "text-blue-500",
    title: "Parámetros Legales",
    description:
      "Recargos, horas extras, jornada nocturna y configuración según el Código Sustantivo del Trabajo de Colombia.",
  },
  {
    href: "/dashboard/settings/concepts",
    icon: BookOpen,
    iconColor: "text-emerald-500",
    title: "Conceptos de Nómina",
    description:
      "Tipos de turno, ausencias, incapacidades y permisos que se asignan a los empleados. Define el impacto en horas y si son remunerados.",
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Ajusta los parámetros del sistema según las necesidades de tu empresa
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map(s => (
          <Link key={s.href} href={s.href}>
            <Card className="hover:shadow-md transition-all cursor-pointer group border-2 hover:border-primary/20 h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <s.icon className={`h-9 w-9 ${s.iconColor}`} />
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="mt-4">{s.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {s.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
