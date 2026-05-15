"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function PayrollPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.push("/dashboard/payroll/periods")
  }, [router])
  
  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">Redirigiendo a períodos de nómina...</p>
    </div>
  )
}
