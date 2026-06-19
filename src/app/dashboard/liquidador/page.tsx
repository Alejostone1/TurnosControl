"use client"

import { useEffect } from "react"

export default function LiquidadorDashboardPage() {
  useEffect(() => { window.location.href = "/dashboard-auxiliar" }, [])
  return null
}
