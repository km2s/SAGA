import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      discordId: string
      username: string
    }
  }

  interface Profile {
    id: string
    username: string
    avatar: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    discordId: string
    username: string
    avatar?: string
  }
}
