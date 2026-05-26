"use client"

import { useState, useEffect } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  Lock,
  Mail,
  ArrowRight,
  Building2,
  Clock,
  TrendingUp,
  Sparkles,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()

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
      if ((session?.user as any)?.userType === "auxiliar") {
        toast.error("Esta pantalla es para administradores. Use el acceso de Auxiliar.")
        await import("next-auth/react").then(m => m.signOut({ redirect: false }))
        return
      }
      sessionStorage.setItem("turnos_session_active", "1")
      toast.success("Inicio de sesión exitoso")
      window.location.href = "/dashboard"
    } catch {
      toast.error("Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center p-4">

      {/* Card container */}
      <div className={cn(
        "w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-700",
        isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}>
        <div className="flex flex-col lg:flex-row min-h-[540px]">

          {/* Left panel — branding, hidden on small screens */}
          <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-blue-600 to-blue-800 flex-col items-center justify-center p-10 text-white">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-1">TurnosPro</h1>
            <p className="text-blue-100 text-sm text-center mb-8 max-w-xs">
              Sistema de Control de Turnos y Nómina empresarial
            </p>
            <div className="grid grid-cols-3 gap-4 text-center w-full max-w-xs">
              {[
                { icon: Clock,      label: "Horarios" },
                { icon: TrendingUp, label: "Nómina" },
                { icon: Sparkles,   label: "Automático" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="bg-white/10 rounded-xl p-3">
                  <Icon className="w-5 h-5 mx-auto mb-1.5" />
                  <p className="text-xs font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel — form */}
          <div className="flex-1 flex flex-col justify-center p-6 sm:p-10">
            {/* Mobile logo */}
            <div className="flex items-center gap-3 mb-6 lg:hidden">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">TurnosPro</h1>
                <p className="text-xs text-gray-500">Sistema de Turnos y Nómina</p>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">Iniciar Sesión</h2>
            <p className="text-gray-500 text-sm mb-7">Accede al sistema de gestión de turnos</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@empresa.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base"
                />
              </div>

              {/* Password */}
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
                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 pr-11 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Iniciando sesión...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    Iniciar Sesión
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>
            </form>

            {/* Demo credentials */}
            <div className="mt-5 p-3.5 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-center text-blue-800 text-xs font-semibold uppercase tracking-wide mb-1.5">
                Credenciales de Demo
              </p>
              <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 justify-center text-xs text-center">
                <p className="text-gray-600">
                  <span className="text-blue-600 font-medium">Correo:</span> admin@demo.com
                </p>
                <p className="text-gray-600">
                  <span className="text-blue-600 font-medium">Contraseña:</span> admin123
                </p>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-gray-500">
              ¿Eres auxiliar?{" "}
              <Link href="/login-auxiliar" className="text-blue-600 hover:text-blue-700 font-medium">
                Acceso Auxiliar →
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Back link */}
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
