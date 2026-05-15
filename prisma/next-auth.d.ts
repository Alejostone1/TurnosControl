import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            empresaId: string;
            empresaNombre?: string;
            empresaSlug?: string;
            userType?: string;
            role: string;
        } & DefaultSession["user"]
    }

    interface User {
        empresaId: string;
        empresaNombre?: string;
        empresaSlug?: string;
        userType?: string;
        role: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        empresaId: string;
        empresaNombre?: string;
        empresaSlug?: string;
        userType?: string;
        role: string;
    }
}