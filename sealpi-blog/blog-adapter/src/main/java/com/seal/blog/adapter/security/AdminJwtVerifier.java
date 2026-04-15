package com.seal.blog.adapter.security;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.HashSet;
import java.util.Set;

/**
 * Minimal HS256 JWT verifier for v1.
 *
 * Supports verifying signature and extracting a numeric github user id claim.
 */
public class AdminJwtVerifier {

    private final byte[] secret;
    private final Set<String> adminGithubUserIds;
    private final String githubUserIdClaim;
    private final String githubUserApi;
    private final boolean allowLegacyJwt;
    private final HttpClient httpClient;

    public AdminJwtVerifier(
            String secret,
            String adminGithubUserIdsCsv,
            String githubUserIdClaim,
            String githubUserApi,
            boolean allowLegacyJwt
    ) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalArgumentException("admin.jwt.secret must not be blank");
        }
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.adminGithubUserIds = parseCsv(adminGithubUserIdsCsv);
        this.githubUserIdClaim = (githubUserIdClaim == null || githubUserIdClaim.isBlank()) ? "githubUserId" : githubUserIdClaim;
        this.githubUserApi = (githubUserApi == null || githubUserApi.isBlank()) ? "https://api.github.com/user" : githubUserApi;
        this.allowLegacyJwt = allowLegacyJwt;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();

        if (this.adminGithubUserIds.isEmpty()) {
            throw new IllegalArgumentException("admin.github.userIds must not be empty");
        }
    }

    public void verifyAuthorizationHeader(String header) {
        if (header == null || header.isBlank()) {
            throw new AdminAuthException(401, "401", "缺少Authorization");
        }
        String prefix = "Bearer ";
        if (!header.startsWith(prefix)) {
            throw new AdminAuthException(401, "401", "Authorization格式错误");
        }
        String token = header.substring(prefix.length()).trim();
        if (token.isEmpty()) {
            throw new AdminAuthException(401, "401", "缺少token");
        }

        // Token shape routing:
        // - If it looks like a JWT (3 parts), verify signature with admin.jwt.secret.
        // - Otherwise, treat it as GitHub OAuth access token and validate via GitHub API.
        if (looksLikeJwt(token)) {
            verifyLegacyJwt(token);
            return;
        }
        if (verifyGithubAccessToken(token)) {
            return;
        }
        throw new AdminAuthException(401, "401", "token无效或已过期");
    }

    private static boolean looksLikeJwt(String token) {
        if (token == null) return false;
        int dots = 0;
        for (int i = 0; i < token.length(); i++) {
            if (token.charAt(i) == '.') dots++;
        }
        return dots == 2;
    }

    private boolean verifyGithubAccessToken(String token) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(githubUserApi))
                    .timeout(Duration.ofSeconds(5))
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/vnd.github+json")
                    .header("X-GitHub-Api-Version", "2022-11-28")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return false;
            }

            String githubUserId = extractJsonStringOrNumber(response.body(), "id");
            if (githubUserId == null || githubUserId.isBlank()) {
                return false;
            }
            if (!adminGithubUserIds.contains(githubUserId)) {
                throw new AdminAuthException(403, "403", "无权限");
            }
            return true;
        } catch (AdminAuthException ex) {
            throw ex;
        } catch (Exception ex) {
            return false;
        }
    }

    private void verifyLegacyJwt(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new AdminAuthException(401, "401", "token格式错误");
        }
        String headerB64 = parts[0];
        String payloadB64 = parts[1];
        String sigB64 = parts[2];

        String signingInput = headerB64 + "." + payloadB64;
        String expectedSig = base64UrlEncode(hmacSha256(signingInput.getBytes(StandardCharsets.UTF_8), secret));
        if (!constantTimeEquals(expectedSig, sigB64)) {
            throw new AdminAuthException(401, "401", "token签名无效");
        }

        String payloadJson = new String(base64UrlDecode(payloadB64), StandardCharsets.UTF_8);
        String githubUserId = extractJsonStringOrNumber(payloadJson, githubUserIdClaim);
        if (githubUserId == null || githubUserId.isBlank()) {
            throw new AdminAuthException(403, "403", "token缺少管理员标识");
        }

        if (!adminGithubUserIds.contains(githubUserId)) {
            throw new AdminAuthException(403, "403", "无权限");
        }
    }

    private static Set<String> parseCsv(String csv) {
        Set<String> out = new HashSet<>();
        if (csv == null) return out;
        for (String s : csv.split(",")) {
            String t = s.trim();
            if (!t.isEmpty()) out.add(t);
        }
        return out;
    }

    private static byte[] hmacSha256(byte[] data, byte[] secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return mac.doFinal(data);
        } catch (Exception e) {
            throw new IllegalStateException("HMAC init failed", e);
        }
    }

    private static String base64UrlEncode(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static byte[] base64UrlDecode(String b64) {
        return Base64.getUrlDecoder().decode(b64);
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        if (a.length() != b.length()) return false;
        int r = 0;
        for (int i = 0; i < a.length(); i++) {
            r |= a.charAt(i) ^ b.charAt(i);
        }
        return r == 0;
    }

    /**
     * Extremely small JSON claim extractor for v1, expects flat JSON and simple scalar values.
     * Supports number (unquoted) and string (quoted) values.
     */
    private static String extractJsonStringOrNumber(String json, String key) {
        if (json == null || key == null) return null;
        String needle = "\"" + key + "\":";
        int idx = json.indexOf(needle);
        if (idx < 0) return null;
        int p = idx + needle.length();

        // skip whitespace
        while (p < json.length() && Character.isWhitespace(json.charAt(p))) p++;
        if (p >= json.length()) return null;

        char c = json.charAt(p);
        if (c == '"') {
            int end = json.indexOf('"', p + 1);
            if (end < 0) return null;
            return json.substring(p + 1, end);
        }

        // number or bare token until delimiter
        int end = p;
        while (end < json.length()) {
            char ch = json.charAt(end);
            if (ch == ',' || ch == '}' || Character.isWhitespace(ch)) break;
            end++;
        }
        if (end <= p) return null;
        return json.substring(p, end);
    }
}
