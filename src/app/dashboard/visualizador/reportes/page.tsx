"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, BarChart2, CheckCircle2 } from "lucide-react"

const reportes = [
  { title: "Programaciones Aprobadas", description: "Reporte de programaciones aprobadas por período", icon: CheckCircle2 },
  { title: "Liquidaciones Aprobadas", description: "Resumen de liquidaciones aprobadas y rechazadas", icon: BarChart2 },
  { title: "Historial de Aprobaciones", description: "Trazabilidad completa de aprobaciones realizadas", icon: FileText },
]

export default function ReportesVisualizadorPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-purple-600" />
        <div>
          <h1 className="text-xl font-bold">Reportes</h1>
          <p className="text-sm text-muted-foreground">Reportes de revisión y aprobación</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportes.map(r => (
          <Card key={r.title} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <r.icon className="h-4 w-4 text-purple-600" />
                {r.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{r.description}</p>
              <Button variant="outline" size="sm" className="w-full">
                <Download className="h-4 w-4 mr-2" /> Exportar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
