import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    user: {
      name?: string | null
      email?: string | null
      image?: string | null
      githubUserId?: string
      githubLogin?: string
      isAdmin?: boolean
      canComment?: boolean
      isBanned?: boolean
      displayName?: string | null
      profileBio?: string | null
      profileBlogUrl?: string | null
      githubProfileUrl?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    githubUserId?: string
    githubAccessToken?: string
    adminAccessToken?: string
    githubLogin?: string
    isAdmin?: boolean
    canComment?: boolean
    error?: string
    displayName?: string
    profileBio?: string
    profileBlogUrl?: string
    githubProfileUrl?: string
  }
}
