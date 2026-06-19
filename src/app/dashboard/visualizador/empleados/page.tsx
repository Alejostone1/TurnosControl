"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Users } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default function EmpleadosVisualizadorPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-purple-600" />
        <div>
          <h1 className="text-xl font-bold">Consulta de Empleados</h1>
          <p className="text-sm text-muted-foreground">Visualización de información de empleados (solo lectura)</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">
            La consulta detallada de empleados se encuentra disponible en el panel de Programaciones y Liquidaciones.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard/visualizador/programaciones">
              <Button variant="outline">Ver Programaciones <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
            </Link>
            <Link href="/dashboard/visualizador/liquidaciones">
              <Button variant="outline">Ver Liquidaciones <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
