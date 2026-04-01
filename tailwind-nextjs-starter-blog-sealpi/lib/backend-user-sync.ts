import { buildApiUrl } from '@/lib/api-config'

export type GithubProfileForSync = {
  id: string | number
  login: string
  name?: string | null
  email?: string | null
  image?: string | null
  bio?: string | null
  blogUrl?: string | null
  profileUrl?: string | null
}

export type BackendUserSyncResult =
  | { ok: true; commentPermission: string; nickname?: string | null; banned: false }
  | { ok: false; errorCode: string; errorMessage?: string; banned: boolean }

/**
 * OAuth signIn 阶段由服务端调用：将 GitHub 资料同步到 Java 用户表。
 * 未配置 BLOG_INTERNAL_SYNC_SECRET 时跳过（仅本地开发可接受）。
 */
export async function syncGithubUserToBackend(
  profile: GithubProfileForSync
): Promise<BackendUserSyncResult> {
  const secret = process.env.BLOG_INTERNAL_SYNC_SECRET?.trim()
  if (!secret) {
    console.warn('[backend-user-sync] BLOG_INTERNAL_SYNC_SECRET 未配置，跳过用户落库')
    return {
      ok: true,
      commentPermission: 'READ_ONLY',
      nickname: profile.name,
      banned: false,
    }
  }

  const githubId = typeof profile.id === 'number' ? profile.id : Number(profile.id)
  if (!Number.isFinite(githubId)) {
    return { ok: false, errorCode: 'INVALID_GITHUB_ID', banned: false }
  }

  const body = {
    githubId,
    githubLogin: profile.login,
    nickname: profile.name ?? profile.login,
    email: profile.email ?? null,
    avatarUrl: profile.image ?? null,
    bio: profile.bio ?? null,
    websiteUrl: profile.blogUrl ?? null,
    githubProfileUrl: profile.profileUrl ?? `https://github.com/${profile.login}`,
  }

  try {
    const res = await fetch(buildApiUrl('/api/v1/internal/users/oauth-sync'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Blog-Internal-Sync-Secret': secret,
      },
      body: JSON.stringify(body),
    })

    const json = (await res.json()) as {
      success?: boolean
      errorCode?: string
      errorMessage?: string
      data?: { commentPermission?: string; nickname?: string | null; banned?: boolean }
    }

    if (!res.ok || json.success === false) {
      const code = json.errorCode || 'SYNC_FAILED'
      return {
        ok: false,
        errorCode: code,
        errorMessage: json.errorMessage,
        banned: code === 'BANNED',
      }
    }

    const perm = json.data?.commentPermission || 'READ_ONLY'
    return {
      ok: true,
      commentPermission: perm,
      nickname: json.data?.nickname ?? profile.name,
      banned: false,
    }
  } catch (e) {
    console.error('[backend-user-sync] fetch failed', e)
    return { ok: false, errorCode: 'NETWORK', banned: false }
  }
}
