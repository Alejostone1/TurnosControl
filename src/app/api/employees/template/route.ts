import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import * as XLSX from "xlsx"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const wb = XLSX.utils.book_new()

  // ── Hoja 1: Plantilla de datos ──────────────────────────────
  const headers = [
    "nombres*",
    "apellidos*",
    "tipoDocumento*",
    "numeroDocumento*",
    "fechaIngreso*",
    "salarioBase*",
    "tipoVinculacion*",
    "tipoContrato*",
    "horasSemanales*",
    "tieneAuxilioTransporte*",
    "centroCosto",
    "programa",
    "modalidad",
    "cargo",
  ]

  const exampleRow = [
    "Juan Carlos",
    "Rodríguez Pérez",
    "CEDULA_CIUDADANIA",
    "10245678",
    "2025-01-15",
    1423500,
    "TIEMPO_COMPLETO",
    "TERMINO_INDEFINIDO",
    44,
    "SI",
    "400013",
    "Creeme",
    "Internado",
    "Educador",
  ]

  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow])

  ws["!cols"] = [
    { wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 18 }, { wch: 14 },
    { wch: 14 }, { wch: 22 }, { wch: 24 }, { wch: 16 }, { wch: 24 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, "Empleados")

  // ── Hoja 2: Referencia de valores válidos ───────────────────
  const valoresData = [
    ["CAMPO", "VALORES VÁLIDOS / INSTRUCCIONES"],
    ["tipoDocumento*", "CEDULA_CIUDADANIA | TARJETA_IDENTIDAD | CEDULA_EXTRANJERIA | PASAPORTE | NIT"],
    ["tipoVinculacion*", "TIEMPO_COMPLETO | MEDIO_TIEMPO | TEMPORAL | APRENDIZ_SENA | PRACTICANTE"],
    ["tipoContrato*", "TERMINO_INDEFINIDO | TERMINO_FIJO | OBRA_LABOR | PRESTACION_SERVICIOS | APRENDIZAJE"],
    ["tieneAuxilioTransporte*", "SI  o  NO"],
    ["fechaIngreso*", "Formato YYYY-MM-DD  (ejemplo: 2025-01-15)"],
    ["salarioBase*", "Número entero en COP, sin puntos ni signos  (ejemplo: 1423500)"],
    ["horasSemanales*", "Número entre 1 y 48  (ejemplo: 44)"],
    [],
    ["NOTAS IMPORTANTES"],
    ["• Los campos marcados con * son obligatorios"],
    ["• Los demás campos (centroCosto, programa, modalidad, cargo) son opcionales"],
    ["• No modificar los nombres de las columnas de la hoja Empleados"],
    ["• No dejar filas vacías entre los datos"],
    ["• La fila de encabezados (fila 1) no se importa"],
    ["• Se pueden importar hasta 1000 empleados por archivo"],
  ]

  const wsValores = XLSX.utils.aoa_to_sheet(valoresData)
  wsValores["!cols"] = [{ wch: 26 }, { wch: 70 }]
  XLSX.utils.book_append_sheet(wb, wsValores, "Valores Válidos")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="plantilla_empleados.xlsx"`,
      "Cache-Control": "no-store",
    },
  })
}
