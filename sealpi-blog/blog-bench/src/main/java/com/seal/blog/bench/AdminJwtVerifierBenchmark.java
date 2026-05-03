package com.seal.blog.bench;

import com.seal.blog.adapter.security.AdminJwtVerifier;
import org.openjdk.jmh.annotations.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.concurrent.TimeUnit;

@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.MICROSECONDS)
@State(Scope.Benchmark)
@Fork(value = 1, jvmArgsAppend = {"-Xms512m", "-Xmx512m"})
@Warmup(iterations = 3, time = 2)
@Measurement(iterations = 5, time = 3)
public class AdminJwtVerifierBenchmark {

    private static final String SECRET = "bench-secret-bench-secret-bench-secret";
    private static final String GH_USER = "12345";

    private AdminJwtVerifier verifier;
    private String validHeader;

    @Setup(Level.Trial)
    public void setup() throws Exception {
        verifier = new AdminJwtVerifier(SECRET, GH_USER, "githubUserId", "https://api.github.com/user", true);
        String header = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        long exp = (System.currentTimeMillis() / 1000L) + 3600;
        String payload = "{\"githubUserId\":\"" + GH_USER + "\",\"exp\":" + exp + "}";
        String h64 = b64u(header.getBytes(StandardCharsets.UTF_8));
        String p64 = b64u(payload.getBytes(StandardCharsets.UTF_8));
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String sig = b64u(mac.doFinal((h64 + "." + p64).getBytes(StandardCharsets.UTF_8)));
        validHeader = "Bearer " + h64 + "." + p64 + "." + sig;
    }

    private static String b64u(byte[] b) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    @Benchmark
    public void verifyHs256JwtPath() {
        verifier.verifyAuthorizationHeader(validHeader);
    }
}
