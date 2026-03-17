import type { NextAuthConfig } from 'next-auth'
import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'

const adminIds = (process.env.ADMIN_GITHUB_IDS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)

function isAdminUserId(value?: string | null) {
  return Boolean(value) && adminIds.includes(String(value))
}

export const authConfig: NextAuthConfig = {
  session: {
    strategy: 'jwt',
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const githubUserId = profile?.id ? String(profile.id) : null
      return isAdminUserId(githubUserId)
    },
    async jwt({ token, account, profile }) {
      const githubUserId = profile?.id
        ? String(profile.id)
        : (token.githubUserId as string | undefined)
      token.githubUserId = githubUserId

      if (account?.access_token) {
        token.githubAccessToken = account.access_token
      }

      token.isAdmin = isAdminUserId(githubUserId)
      return token
    },
    async session({ session, token }) {
      session.user.githubUserId = token.githubUserId as string | undefined
      session.user.isAdmin = Boolean(token.isAdmin)
      session.accessToken = token.githubAccessToken as string | undefined
      return session
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
export const { GET, POST } = handlers
