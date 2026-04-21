package com.seal.blog.adapter.security;

import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit tests for AdminJwtVerifier — no Spring context required.
 *
 * Covers constructor validation, JWT path (HS256), allowLegacyJwt=false guard,
 * and edge cases not exercised by the integration suite (e.g. missing exp claim).
 */
class AdminJwtVerifierTest {

    private static final String SECRET = "test-secret";
    private static final String USER_ID = "42";

    // -----------------------------------------------------------------------
    // Constructor validation
    // -----------------------------------------------------------------------

    @Test
    void constructor_allowLegacyJwt_withBlankSecret_throws() {
        assertThrows(IllegalArgumentException.class, () ->
                new AdminJwtVerifier("", "42", "githubUserId", null, true));
    }

    @Test
    void constructor_allowLegacyJwt_withNullSecret_throws() {
        assertThrows(IllegalArgumentException.class, () ->
                new AdminJwtVerifier(null, "42", "githubUserId", null, true));
    }

    @Test
    void constructor_legacyJwtDisabled_nullSecretIsOk() {
        // When JWT path is off, no secret is needed — should not throw.
        assertDoesNotThrow(() ->
                new AdminJwtVerifier(null, "42", "githubUserId", null, false));
    }

    // -----------------------------------------------------------------------
    // Missing / malformed Authorization header
    // -----------------------------------------------------------------------

    @Test
    void verifyHeader_nullHeader_throws401() {
        AdminJwtVerifier v = verifier();
        AdminAuthException ex = assertThrows(AdminAuthException.class,
                () -> v.verifyAuthorizationHeader(null));
        assertEquals(401, ex.getHttpStatus());
    }

    @Test
    void verifyHeader_blankHeader_throws401() {
        AdminJwtVerifier v = verifier();
        AdminAuthException ex = assertThrows(AdminAuthException.class,
                () -> v.verifyAuthorizationHeader("  "));
        assertEquals(401, ex.getHttpStatus());
    }

    @Test
    void verifyHeader_missingBearerPrefix_throws401() {
        AdminJwtVerifier v = verifier();
        AdminAuthException ex = assertThrows(AdminAuthException.class,
                () -> v.verifyAuthorizationHeader("Token abc"));
        assertEquals(401, ex.getHttpStatus());
    }

    @Test
    void verifyHeader_bearerPrefixOnly_throws401() {
        AdminJwtVerifier v = verifier();
        AdminAuthException ex = assertThrows(AdminAuthException.class,
                () -> v.verifyAuthorizationHeader("Bearer "));
        assertEquals(401, ex.getHttpStatus());
    }

    // -----------------------------------------------------------------------
    // allowLegacyJwt=false: JWT-shaped tokens must be rejected before signature check
    // -----------------------------------------------------------------------

    @Test
    void verifyHeader_jwtTokenWhenLegacyDisabled_throws401() {
        // Even a perfectly valid JWT must be rejected when allowLegacyJwt=false.
        AdminJwtVerifier v = new AdminJwtVerifier(SECRET, USER_ID, "githubUserId", null, false);
        String jwt = makeJwt(USER_ID, System.currentTimeMillis() / 1000L + 3600);
        AdminAuthException ex = assertThrows(AdminAuthException.class,
                () -> v.verifyAuthorizationHeader("Bearer " + jwt));
        assertEquals(401, ex.getHttpStatus());
    }

    // -----------------------------------------------------------------------
    // Valid JWT — allowed user
    // -----------------------------------------------------------------------

    @Test
    void verifyHeader_validJwtWithExp_whitelistedUser_noException() {
        AdminJwtVerifier v = verifier();
        long exp = System.currentTimeMillis() / 1000L + 3600;
        String jwt = makeJwt(USER_ID, exp);
        assertDoesNotThrow(() -> v.verifyAuthorizationHeader("Bearer " + jwt));
    }

    @Test
    void verifyHeader_validJwtWithoutExp_whitelistedUser_noException() {
        // exp is optional — a JWT without it must still be accepted if signature is valid.
        AdminJwtVerifier v = verifier();
        String jwt = makeJwtNoExp(USER_ID);
        assertDoesNotThrow(() -> v.verifyAuthorizationHeader("Bearer " + jwt));
    }

    // -----------------------------------------------------------------------
    // Expired / tampered JWT
    // -----------------------------------------------------------------------

    @Test
    void verifyHeader_expiredJwt_throws401() {
        AdminJwtVerifier v = verifier();
        long exp = System.currentTimeMillis() / 1000L - 1; // 1 second in the past
        String jwt = makeJwt(USER_ID, exp);
        AdminAuthException ex = assertThrows(AdminAuthException.class,
                () -> v.verifyAuthorizationHeader("Bearer " + jwt));
        assertEquals(401, ex.getHttpStatus());
    }

    @Test
    void verifyHeader_tamperedSignature_throws401() {
        AdminJwtVerifier v = verifier();
        long exp = System.currentTimeMillis() / 1000L + 3600;
        String jwt = makeJwt(USER_ID, exp);
        // Flip the last character of the signature
        String tampered = jwt.substring(0, jwt.length() - 1) +
                (jwt.charAt(jwt.length() - 1) == 'A' ? 'B' : 'A');
        AdminAuthException ex = assertThrows(AdminAuthException.class,
                () -> v.verifyAuthorizationHeader("Bearer " + tampered));
        assertEquals(401, ex.getHttpStatus());
    }

    // -----------------------------------------------------------------------
    // Non-whitelisted user
    // -----------------------------------------------------------------------

    @Test
    void verifyHeader_validJwtNonWhitelistedUser_throws403() {
        AdminJwtVerifier v = verifier(); // whitelist: only "42"
        long exp = System.currentTimeMillis() / 1000L + 3600;
        String jwt = makeJwt("999", exp); // user "999" not in whitelist
        AdminAuthException ex = assertThrows(AdminAuthException.class,
                () -> v.verifyAuthorizationHeader("Bearer " + jwt));
        assertEquals(403, ex.getHttpStatus());
    }

    @Test
    void verifyHeader_validJwtMissingUserIdClaim_throws403() {
        AdminJwtVerifier v = verifier();
        // Build a JWT whose payload has no githubUserId claim
        String header = b64("""
                {"alg":"HS256","typ":"JWT"}""");
        String payload = b64("""
                {"sub":"someone","exp":9999999999}""");
        String sig = b64Sign(header + "." + payload);
        AdminAuthException ex = assertThrows(AdminAuthException.class,
                () -> v.verifyAuthorizationHeader("Bearer " + header + "." + payload + "." + sig));
        assertEquals(403, ex.getHttpStatus());
    }

    // -----------------------------------------------------------------------
    // Custom githubUserIdClaim name
    // -----------------------------------------------------------------------

    @Test
    void verifyHeader_customClaimName_extractsCorrectly() {
        AdminJwtVerifier v = new AdminJwtVerifier(SECRET, "55", "uid", null, true);
        // Build JWT with custom "uid" claim
        String header = b64("""
                {"alg":"HS256","typ":"JWT"}""");
        String payload = b64("""
                {"uid":"55","exp":9999999999}""");
        String sig = b64Sign(header + "." + payload);
        assertDoesNotThrow(() -> v.verifyAuthorizationHeader("Bearer " + header + "." + payload + "." + sig));
    }

    // -----------------------------------------------------------------------
    // helpers
    // -----------------------------------------------------------------------

    /** Verifier with allowLegacyJwt=true, secret=test-secret, whitelist=[42]. */
    private static AdminJwtVerifier verifier() {
        return new AdminJwtVerifier(SECRET, USER_ID, "githubUserId", null, true);
    }

    /** Signed HS256 JWT with githubUserId claim and exp. */
    private static String makeJwt(String userId, long expSeconds) {
        String header = b64("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
        String payload = b64("{\"githubUserId\":\"" + userId + "\",\"exp\":" + expSeconds + "}");
        return header + "." + payload + "." + b64Sign(header + "." + payload);
    }

    /** Signed HS256 JWT with githubUserId but NO exp claim. */
    private static String makeJwtNoExp(String userId) {
        String header = b64("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
        String payload = b64("{\"githubUserId\":\"" + userId + "\"}");
        return header + "." + payload + "." + b64Sign(header + "." + payload);
    }

    private static String b64(String json) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(json.getBytes(StandardCharsets.UTF_8));
    }

    private static String b64Sign(String input) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
