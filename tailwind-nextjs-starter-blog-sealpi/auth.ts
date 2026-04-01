import type { NextAuthConfig } from 'next-auth'
import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { SignJWT } from 'jose'
import { syncGithubUserToBackend } from '@/lib/backend-user-sync'

const DEFAULT_ADMIN_ID = '190578785'
const adminIds = Array.from(
  new Set(
    [DEFAULT_ADMIN_ID, ...(process.env.ADMIN_GITHUB_IDS || '').split(',')]
      .map((item) => item.trim())
      .filter(Boolean)
  )
)

function isAdminUserId(value?: string | null) {
  return Boolean(value) && adminIds.includes(String(value))
}

const ADMIN_JWT_CLAIM = process.env.ADMIN_JWT_GITHUBUSERIDCLAIM || 'githubUserId'

async function signAdminBearerToken(githubUserId?: string) {
  const secret = process.env.ADMIN_JWT_SECRET
  if (!secret || !githubUserId) {
    return undefined
  }

  return new SignJWT({ [ADMIN_JWT_CLAIM]: githubUserId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(new TextEncoder().encode(secret))
}

type GhProfile = {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  login: string
  bio?: string | null
  blogUrl?: string | null
  profileUrl?: string | null
}

export const authConfig: NextAuthConfig = {
  session: {
    strategy: 'jwt',
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      authorization: { params: { scope: 'read:user user:email' } },
      profile(gh) {
        const login = gh.login as string
        return {
          id: String(gh.id),
          name: (gh.name as string | null | undefined) ?? login,
          email: (gh.email as string | null | undefined) ?? null,
          image: gh.avatar_url as string | undefined,
          login,
          bio: (gh.bio as string | null | undefined) ?? null,
          blogUrl: (gh.blog as string | null | undefined) ?? null,
          profileUrl: (gh.html_url as string | null | undefined) ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.id) {
        return false
      }
      const p = profile as unknown as GhProfile
      const sync = await syncGithubUserToBackend({
        id: p.id,
        login: p.login,
        name: p.name,
        email: p.email,
        image: p.image,
        bio: p.bio,
        blogUrl: p.blogUrl,
        profileUrl: p.profileUrl,
      })
      if (sync.banned) {
        return '/login?error=banned'
      }
      if (!sync.ok && (!('errorCode' in sync) || sync.errorCode !== 'NETWORK')) {
        return '/login?error=sync'
      }
      return true
    },
    async jwt({ token, account, profile }) {
      const p = profile as unknown as GhProfile | undefined
      if (p?.id) {
        token.githubUserId = String(p.id)
        token.githubLogin = p.login
        token.profileBio = p.bio ?? undefined
        token.profileBlogUrl = p.blogUrl ?? undefined
        token.githubProfileUrl = p.profileUrl ?? undefined
      }

      if (account?.access_token) {
        token.githubAccessToken = account.access_token
      }

      if (account && p) {
        const sync = await syncGithubUserToBackend({
          id: p.id,
          login: p.login,
          name: p.name,
          email: p.email,
          image: p.image,
          bio: p.bio,
          blogUrl: p.blogUrl,
          profileUrl: p.profileUrl,
        })
        token.canComment = sync.ok && sync.commentPermission === 'ALLOWED'
        if (sync.ok && sync.nickname) {
          token.displayName = sync.nickname
        }
      }

      token.isAdmin = isAdminUserId(token.githubUserId as string | undefined)
      token.adminAccessToken = await signAdminBearerToken(token.githubUserId as string | undefined)
      return token
    },
    async session({ session, token }) {
      session.user.githubUserId = token.githubUserId as string | undefined
      session.user.githubLogin = token.githubLogin as string | undefined
      session.user.isAdmin = Boolean(token.isAdmin)
      session.user.canComment = Boolean(token.canComment)
      session.user.profileBio = token.profileBio as string | undefined
      session.user.profileBlogUrl = token.profileBlogUrl as string | undefined
      session.user.githubProfileUrl = token.githubProfileUrl as string | undefined
      session.user.displayName =
        (token.displayName as string | undefined) ?? session.user.name ?? undefined
      session.accessToken = token.adminAccessToken as string | undefined
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
export const { GET, POST } = handlers
