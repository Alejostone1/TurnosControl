"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, Eye, EyeOff, Check, X } from "lucide-react"
import { toast } from "sonner"

interface FormErrors {
  nombres?: string; apellidos?: string; correo?: string;
  contrasena?: string; confirmarContrasena?: string;
}

interface PasswordStrength {
  score: number; message: string; color: string;
}

export default function NewAuxiliarPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, message: "", color: "" })

  const [formData, setFormData] = useState({
    nombres: "", apellidos: "", documento: "", telefono: "",
    correo: "", contrasena: "", confirmarContrasena: "",
  })

  useEffect(() => {
    const saved = localStorage.getItem('auxiliar-form-draft')
    if (saved) {
      try {
        const draft = JSON.parse(saved)
        setFormData(draft)
      } catch {}
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('auxiliar-form-draft', JSON.stringify(formData))
    }, 1000)
    return () => clearTimeout(timer)
  }, [formData])

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[a-z]/.test(password)) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    const levels = [
      { score: 0, message: "", color: "" },
      { score: 1, message: "Débil", color: "text-red-500" },
      { score: 3, message: "Media", color: "text-yellow-500" },
      { score: 5, message: "Fuerte", color: "text-green-500" },
      { score: 6, message: "Muy fuerte", color: "text-green-600" }
    ]

    return levels.find(level => score <= level.score) || levels[4]
  }

  const validateField = useCallback((name: string, value: string): string | undefined => {
    if (!touched.has(name)) return undefined
    
    switch (name) {
      case 'nombres':
        return !value.trim() ? "El nombre es requerido" : undefined
      case 'apellidos':
        return !value.trim() ? "Los apellidos son requeridos" : undefined
      case 'correo':
        if (!value.trim()) return "El correo es requerido"
        return !/\S+@\S+\.\S+/.test(value) ? "Correo inválido" : undefined
      case 'contrasena':
        if (!value) return "La contraseña es requerida"
        if (value.length < 8) return "Mínimo 8 caracteres"
        return undefined
      case 'confirmarContrasena':
        return value !== formData.contrasena ? "Las contraseñas no coinciden" : undefined
      default:
        return undefined
    }
  }, [touched, formData.contrasena])

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    
    if (name === 'contrasena') {
      setPasswordStrength(calculatePasswordStrength(value))
    }
    
    if (touched.has(name)) {
      const error = validateField(name, value)
      setErrors(prev => ({ ...prev, [name]: error }))
    }
  }

  const handleBlur = (name: string) => {
    setTouched(prev => new Set(prev).add(name))
    const error = validateField(name, formData[name as keyof typeof formData])
    setErrors(prev => ({ ...prev, [name]: error }))
  }

  const validate = (): FormErrors => {
    const newErrors: FormErrors = {}
    const fields = ['nombres', 'apellidos', 'correo', 'contrasena', 'confirmarContrasena']
    
    fields.forEach(field => {
      const error = validateField(field, formData[field as keyof typeof formData])
      if (error) newErrors[field as keyof FormErrors] = error
    })
    
    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const allTouched = new Set(Object.keys(formData))
    setTouched(allTouched)
    
    const validationErrors = validate()
    setErrors(validationErrors)
    
    if (Object.keys(validationErrors).length > 0) {
      toast.error("Por favor corrige los errores")
      return
    }

    setIsSubmitting(true)
    try {
      const { confirmarContrasena, ...payload } = formData
      const res = await fetch("/api/auxiliares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        localStorage.removeItem('auxiliar-form-draft')
        toast.success("✨ Auxiliar creado exitosamente")
        router.push("/dashboard/auxiliares")
      } else {
        const err = await res.json()
        toast.error(err.error || "Error al crear auxiliar")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/auxiliares">
            <Button variant="ghost" size="icon" className="hover:bg-accent/50 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Nuevo Auxiliar</h1>
            <p className="text-sm text-muted-foreground">Registra un auxiliar con acceso al sistema</p>
          </div>
        </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos Personales */}
        <Card className="transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Datos Personales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  Nombres <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input 
                    value={formData.nombres} 
                    onChange={e => handleChange("nombres", e.target.value)} 
                    onBlur={() => handleBlur("nombres")}
                    className={`transition-colors ${
                      touched.has('nombres') && errors.nombres 
                        ? 'border-red-500 focus:border-red-500' 
                        : touched.has('nombres') && !errors.nombres
                        ? 'border-green-500 focus:border-green-500'
                        : ''
                    }`}
                    placeholder="Juan"
                    required 
                  />
                  {touched.has('nombres') && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      {errors.nombres ? <X className="h-4 w-4 text-red-500" /> : <Check className="h-4 w-4 text-green-500" />}
                    </div>
                  )}
                </div>
                {errors.nombres && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <X className="h-3 w-3" /> {errors.nombres}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  Apellidos <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input 
                    value={formData.apellidos} 
                    onChange={e => handleChange("apellidos", e.target.value)}
                    onBlur={() => handleBlur("apellidos")}
                    className={`transition-colors ${
                      touched.has('apellidos') && errors.apellidos 
                        ? 'border-red-500 focus:border-red-500' 
                        : touched.has('apellidos') && !errors.apellidos
                        ? 'border-green-500 focus:border-green-500'
                        : ''
                    }`}
                    placeholder="Pérez"
                    required 
                  />
                  {touched.has('apellidos') && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      {errors.apellidos ? <X className="h-4 w-4 text-red-500" /> : <Check className="h-4 w-4 text-green-500" />}
                    </div>
                  )}
                </div>
                {errors.apellidos && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <X className="h-3 w-3" /> {errors.apellidos}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Documento
                </Label>
                <Input 
                  value={formData.documento} 
                  onChange={e => handleChange("documento", e.target.value)} 
                  placeholder="Número de cédula" 
                  className="transition-colors focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Teléfono
                </Label>
                <Input 
                  value={formData.telefono} 
                  onChange={e => handleChange("telefono", e.target.value)} 
                  placeholder="3XX XXX XXXX"
                  className="transition-colors focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acceso al Sistema */}
        <Card className="transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Acceso al Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Correo Electrónico <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input 
                  type="email" 
                  value={formData.correo} 
                  onChange={e => handleChange("correo", e.target.value)}
                  onBlur={() => handleBlur("correo")}
                  className={`transition-colors pr-9 ${
                    touched.has('correo') && errors.correo 
                      ? 'border-red-500 focus:border-red-500' 
                      : touched.has('correo') && !errors.correo
                      ? 'border-green-500 focus:border-green-500'
                      : ''
                  }`}
                  placeholder="correo@ejemplo.com"
                  required 
                />
                {touched.has('correo') && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    {errors.correo ? <X className="h-4 w-4 text-red-500" /> : <Check className="h-4 w-4 text-green-500" />}
                  </div>
                )}
              </div>
              {errors.correo && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <X className="h-3 w-3" /> {errors.correo}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  Contraseña <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    value={formData.contrasena}
                    onChange={e => handleChange("contrasena", e.target.value)}
                    onBlur={() => handleBlur("contrasena")}
                    required
                    className={`pr-9 transition-colors ${
                      touched.has('contrasena') && errors.contrasena 
                        ? 'border-red-500 focus:border-red-500' 
                        : touched.has('contrasena') && !errors.contrasena
                        ? 'border-green-500 focus:border-green-500'
                        : ''
                    }`}
                    placeholder="••••••••"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPass(!showPass)} 
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formData.contrasena && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-medium ${passwordStrength.color}`}>
                        {passwordStrength.message}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{formData.contrasena.length}/8+</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          passwordStrength.score <= 1 ? 'bg-red-500' :
                          passwordStrength.score <= 3 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {errors.contrasena && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <X className="h-3 w-3" /> {errors.contrasena}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  Confirmar Contraseña <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={formData.confirmarContrasena}
                    onChange={e => handleChange("confirmarContrasena", e.target.value)}
                    onBlur={() => handleBlur("confirmarContrasena")}
                    required
                    className={`pr-9 transition-colors ${
                      touched.has('confirmarContrasena') && errors.confirmarContrasena 
                        ? 'border-red-500 focus:border-red-500' 
                        : touched.has('confirmarContrasena') && !errors.confirmarContrasena && formData.confirmarContrasena
                        ? 'border-green-500 focus:border-green-500'
                        : ''
                    }`}
                    placeholder="••••••••"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirm(!showConfirm)} 
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmarContrasena && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <X className="h-3 w-3" /> {errors.confirmarContrasena}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            Los datos se guardan automáticamente como borrador
          </p>
          <div className="flex gap-3">
            <Link href="/dashboard/auxiliares">
              <Button variant="outline" className="transition-colors hover:bg-accent/50">
                Cancelar
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={isSubmitting || Object.keys(errors).length > 0}
              className="transition-all hover:scale-105 active:scale-95"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando…
                </span>
              ) : (
                "Crear Auxiliar"
              )}
            </Button>
          </div>
        </div>
      </form>
      </div>
    </div>
  )
}
