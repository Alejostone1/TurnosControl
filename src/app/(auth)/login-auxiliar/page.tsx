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
  UserCog,
  Clock,
  ClipboardList,
  Eye,
  EyeOff,
  Users,
  ArrowLeft,
} from "lucide-react"

export default function LoginAuxiliarPage() {
  const [email, setEmail]               = useState("")
  const [password, setPassword]         = useState("")
  const [isLoading, setIsLoading]       = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isMounted, setIsMounted]       = useState(false)
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null)
  const router = useRouter()

  useEffect(() => { setIsMounted(true) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error("Credenciales incorrectas")
        return
      }

      const session = await getSession()
      if ((session?.user as any)?.userType !== "auxiliar") {
        toast.error("Esta pantalla es exclusiva para Auxiliares. Use el acceso de Administrador.")
        await import("next-auth/react").then(m => m.signOut({ redirect: false }))
        return
      }

      sessionStorage.setItem("turnos_session_active", "1")
      toast.success("Bienvenido/a, Auxiliar")
      window.location.href = "/dashboard-auxiliar"
    } catch {
      toast.error("Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-emerald-600">
      {/* Background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-white rounded-l-[100px] transform translate-x-[30px]" />
        <div className="absolute right-0 top-0 h-full w-1/2 bg-white rounded-l-[150px] transform translate-x-[60px]" />
        <div className="absolute right-1/4 top-1/4 h-96 w-96 bg-white rounded-full opacity-30" />
        <div className="absolute right-1/3 bottom-1/4 h-64 w-64 bg-white rounded-full opacity-20" />
        <div className="absolute right-0 top-1/3 h-48 w-32 bg-white rounded-l-full opacity-40" />
        <div className="absolute right-0 bottom-1/3 h-32 w-24 bg-white rounded-l-full opacity-30" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-6xl flex items-center justify-center">
          {/* Left — Branding */}
          <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-emerald-600">
            <div className={`text-center space-y-8 transition-all duration-1000 ${isMounted ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"}`}>
              <div className="relative">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                  <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center">
                    <UserCog className="w-10 h-10 text-white" />
                  </div>
                </div>
                <h1 className="text-4xl font-bold text-white mb-2">Portal</h1>
                <h2 className="text-5xl font-bold text-white">Auxiliar</h2>
              </div>

              <div className="space-y-6 text-white max-w-md mx-auto">
                <p className="text-lg leading-relaxed">
                  Accede a las herramientas de gestión de empleados y programación de turnos
                </p>
                <div className="flex items-center justify-center space-x-8">
                  <div className="text-center">
                    <Users className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Empleados</p>
                  </div>
                  <div className="text-center">
                    <Clock className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Turnos</p>
                  </div>
                  <div className="text-center">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Programación</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Form */}
          <div className={`w-full lg:w-1/2 bg-white transition-all duration-1000 delay-300 ${isMounted ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"} rounded-l-3xl shadow-2xl`}>
            <div className="w-full max-w-md mx-auto p-8 lg:pl-16">
              <div className="text-center mb-8">
                <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-600 transition-colors mb-5">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Volver al inicio
                </Link>
                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                  <UserCog className="w-3.5 h-3.5" />
                  Acceso Auxiliar
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Iniciar Sesión</h2>
                <p className="text-gray-600">Portal exclusivo para auxiliares del sistema</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className={`space-y-2 transition-all duration-300 ${focusedField === "email" ? "scale-105" : ""}`}>
                  <Label htmlFor="email" className="text-gray-700 text-sm font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Correo Electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    required
                    className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg transition-all duration-300"
                  />
                </div>

                <div className={`space-y-2 transition-all duration-300 ${focusedField === "password" ? "scale-105" : ""}`}>
                  <Label htmlFor="password" className="text-gray-700 text-sm font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Tu contraseña"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      required
                      className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg transition-all duration-300 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:transform-none"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Iniciando sesión...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      Ingresar al Portal
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </Button>
              </form>

              {/* Demo Credentials */}
              <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="text-center text-emerald-800 text-xs mb-2 font-semibold uppercase tracking-wide">Credenciales de Demo</p>
                <div className="space-y-1 text-center">
                  <p className="text-gray-600 text-xs">
                    <span className="text-emerald-700 font-medium">Correo:</span> auxiliar1@demo.com
                  </p>
                  <p className="text-gray-600 text-xs">
                    <span className="text-emerald-700 font-medium">Contraseña:</span> auxiliar123
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-4 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-500">
                  ¿Eres administrador?{" "}
                  <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                    Acceso de Administrador
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
