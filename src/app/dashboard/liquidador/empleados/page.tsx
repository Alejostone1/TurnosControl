"use client"

import { useEffect } from "react"

export default function EmpleadosLiquidadorPage() {
  useEffect(() => { window.location.href = "/dashboard-auxiliar/empleados" }, [])
  return null
}
