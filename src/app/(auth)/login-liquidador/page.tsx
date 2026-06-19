"use client"

import { useState, useEffect } from "react"
import { signIn, getSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  Lock,
  Mail,
  ArrowRight,
  Calculator,
  Clock,
  ClipboardList,
  Eye,
  EyeOff,
  ArrowLeft,
  Users,
} from "lucide-react"

export default function LoginLiquidadorPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const result = await signIn("credentials", { email, password, redirect: false })
      if (result?.error) {
        toast.error("Credenciales incorrectas")
        return
      }
      const session = await getSession()
      const role = (session?.user as any)?.role
      if (role !== "LIQUIDADOR") {
        toast.error("Esta pantalla es exclusiva para Liquidadores.")
        await import("next-auth/react").then(m => m.signOut({ redirect: false }))
        return
      }
      sessionStorage.setItem("turnos_session_active", "1")
      toast.success("Bienvenido/a, Liquidador")
      window.location.href = "/dashboard-auxiliar"
    } catch {
      toast.error("Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 flex items-center justify-center p-4">
      <div className={cn(
        "w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-700",
        isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}>
        <div className="flex flex-col lg:flex-row min-h-[520px]">
          <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-emerald-600 to-teal-700 flex-col items-center justify-center p-10 text-white">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
              <Calculator className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-1">Portal Liquidador</h1>
            <p className="text-emerald-100 text-sm text-center mb-8 max-w-xs">
              Acceso exclusivo para liquidadores del sistema
            </p>
            <div className="grid grid-cols-2 gap-4 text-center w-full max-w-xs">
              {[
                { icon: Clock,        label: "Turnos" },
                { icon: ClipboardList, label: "Liquidación" },
                { icon: Users,        label: "Empleados" },
                { icon: Calculator,   label: "Nómina" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="bg-white/10 rounded-xl p-3">
                  <Icon className="w-5 h-5 mx-auto mb-1.5" />
                  <p className="text-xs font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center p-6 sm:p-10">
            <div className="flex items-center gap-3 mb-6 lg:hidden">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Portal Liquidador</h1>
                <p className="text-xs text-gray-500">Acceso para liquidadores</p>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">Acceso Liquidador</h2>
            <p className="text-gray-500 text-sm mb-7">Ingresa tus credenciales de liquidador</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="liquidador@empresa.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-base"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-11 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 pr-11 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verificando...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    Ingresar como Liquidador
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-5 p-3.5 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-center text-emerald-800 text-xs font-semibold uppercase tracking-wide mb-1.5">
                Credenciales de Demo
              </p>
              <p className="text-center text-xs text-gray-600">
                <span className="text-emerald-600 font-medium">Email:</span> liquidador@demo.com
                {" · "}
                <span className="text-emerald-600 font-medium">Contraseña:</span> liquidador123
              </p>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-gray-500">
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Acceso Administrador
              </Link>
              <span className="hidden sm:inline">·</span>
              <Link href="/login-visualizador" className="text-purple-600 hover:text-purple-700 font-medium">
                Acceso Visualizador
              </Link>
              <span className="hidden sm:inline">·</span>
              <Link href="/login-auxiliar" className="text-emerald-600 hover:text-emerald-700 font-medium">
                Portal Auxiliar
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Link
        href="/"
        className="absolute top-4 left-4 flex items-center gap-1 text-white/80 hover:text-white text-xs font-medium transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Volver al inicio
      </Link>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
