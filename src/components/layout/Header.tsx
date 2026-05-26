"use client"

import { Bell, Moon, Sun, User, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { useSession, signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

interface HeaderProps {
  onMobileMenuToggle?: () => void
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const { data: session } = useSession()

  const handleSignOut = async () => {
    toast.info("Cerrando sesión...")
    const isAuxiliar = (session?.user as any)?.userType === "auxiliar"
    await signOut({ callbackUrl: isAuxiliar ? "/login-auxiliar" : "/login" })
  }

  const empresaNombre = (session?.user as any)?.empresaNombre

  return (
    <header className="h-14 md:h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
      <div className="flex h-full items-center gap-2 px-3 md:px-6">

        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0 h-9 w-9"
          onClick={onMobileMenuToggle}
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Title — truncates on small screens */}
        <h1 className="flex-1 min-w-0 text-sm md:text-lg font-semibold truncate">
          {empresaNombre
            ? <><span className="hidden sm:inline">{empresaNombre} — </span>Turnos y Nómina</>
            : "Sistema de Nómina"
          }
        </h1>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Cambiar tema</span>
          </Button>

          {/* Notifications — hidden on very small screens */}
          <Button variant="ghost" size="icon" className="hidden sm:flex h-8 w-8 md:h-9 md:w-9">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notificaciones</span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52 md:w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none min-w-0">
                  <p className="font-medium text-sm truncate max-w-[180px]">
                    {session?.user?.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground max-w-[180px]">
                    {session?.user?.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Rol: {(session as any)?.user?.role}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
