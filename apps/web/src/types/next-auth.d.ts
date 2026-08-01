export {}

declare module 'next-auth' {
  interface Session {
    user: {
      discordId: string
      username: string
      image?: string | null
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
