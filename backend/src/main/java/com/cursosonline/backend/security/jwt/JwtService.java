package com.cursosonline.backend.security.jwt;

import com.cursosonline.backend.config.jwt.JwtProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Servicio de bajo nivel para generar y validar JWT firmados con HS256.
 * Mantiene la lógica de codificación, verificación de firma y expiración
 * aislada.
 */
@Service
@RequiredArgsConstructor
public class JwtService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String JWT_HEADER_JSON = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
    private static final String ACCESS_TOKEN_TYPE = "access";
    private static final String REFRESH_TOKEN_TYPE = "refresh";
    private static final Pattern JSON_FIELD_PATTERN = Pattern.compile(
            "\"((?:\\\\.|[^\"])*)\"\\s*:\\s*(\"((?:\\\\.|[^\"])*)\"|-?\\d+|true|false|null)");

    private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();

    private final JwtProperties jwtProperties;
    private final Clock clock = Clock.systemUTC();

    public String generateAccessToken(UserDetails userDetails, Long userId, String email) {
        return generateToken(userDetails, ACCESS_TOKEN_TYPE, accessTokenTtl(), userId, email);
    }

    public String generateRefreshToken(UserDetails userDetails, Long userId, String email) {
        return generateToken(userDetails, REFRESH_TOKEN_TYPE, refreshTokenTtl(), userId, email);
    }

    public String extractUsername(String token) {
        return getClaim(token, "sub", String.class);
    }

    public String extractTokenType(String token) {
        return getClaim(token, "tokenType", String.class);
    }

    public String extractRole(String token) {
        return getClaim(token, "role", String.class);
    }

    public Instant extractExpiration(String token) {
        Long exp = getClaim(token, "exp", Long.class);
        return exp == null ? null : Instant.ofEpochSecond(exp);
    }

    public boolean isTokenValid(String token) {
        try {
            Map<String, Object> claims = parseAndVerify(token);
            String username = asString(claims.get("sub"));
            return username != null && !isExpired(claims);
        } catch (RuntimeException ex) {
            return false;
        }
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            Map<String, Object> claims = parseAndVerify(token);
            String username = asString(claims.get("sub"));
            if (username == null || isExpired(claims)) {
                return false;
            }
            return userDetails == null || username.equals(userDetails.getUsername());
        } catch (RuntimeException ex) {
            return false;
        }
    }

    public String extractTokenTypeOrNull(String token) {
        try {
            return extractTokenType(token);
        } catch (RuntimeException ex) {
            return null;
        }
    }

    private String generateToken(UserDetails userDetails, String tokenType, Duration ttl, Long userId, String email) {
        Instant issuedAt = Instant.now(clock);
        Instant expiresAt = issuedAt.plus(ttl);

        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("iss", jwtProperties.getIssuer());
        claims.put("sub", userDetails.getUsername());
        claims.put("iat", issuedAt.getEpochSecond());
        claims.put("exp", expiresAt.getEpochSecond());
        claims.put("tokenType", tokenType);
        claims.put("jti", UUID.randomUUID().toString());
        if (userId != null) {
            claims.put("userId", userId);
        }
        if (email != null) {
            claims.put("email", email);
        }

        String role = resolvePrimaryAuthority(userDetails.getAuthorities());
        if (role != null) {
            claims.put("role", role);
        }

        String header = base64Url(JWT_HEADER_JSON.getBytes(StandardCharsets.UTF_8));
        String payload = base64Url(serializeClaims(claims));
        String signingInput = header + "." + payload;

        return signingInput + "." + base64Url(sign(signingInput));
    }

    private Duration accessTokenTtl() {
        return Duration.ofMinutes(jwtProperties.getAccessTokenExpirationMinutes());
    }

    private Duration refreshTokenTtl() {
        return Duration.ofDays(jwtProperties.getRefreshTokenExpirationDays());
    }

    private byte[] sign(String signingInput) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo firmar el JWT", ex);
        }
    }

    private Map<String, Object> parseAndVerify(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new IllegalArgumentException("Formato JWT inválido");
        }

        String signingInput = parts[0] + "." + parts[1];
        byte[] expectedSignature = sign(signingInput);
        byte[] actualSignature = BASE64_URL_DECODER.decode(parts[2]);

        if (!MessageDigest.isEqual(expectedSignature, actualSignature)) {
            throw new SecurityException("Firma del token inválida");
        }

        String payloadJson = new String(BASE64_URL_DECODER.decode(parts[1]), StandardCharsets.UTF_8);
        return parseJson(payloadJson);
    }

    private <T> T getClaim(String token, String claimKey, Class<T> type) {
        try {
            Map<String, Object> claims = parseAndVerify(token);
            Object value = claims.get(claimKey);
            if (value == null)
                return null;
            if (type == Long.class && value instanceof Number) {
                return type.cast(((Number) value).longValue());
            }
            return type.cast(value);
        } catch (Exception ex) {
            throw new RuntimeException("Error al extraer claim: " + claimKey, ex);
        }
    }

    private boolean isExpired(Map<String, Object> claims) {
        Object expObj = claims.get("exp");
        if (expObj instanceof Number) {
            long expSeconds = ((Number) expObj).longValue();
            long skew = jwtProperties.getClockSkewSeconds();
            Instant adjustedCurrentTime = Instant.now(clock).minusSeconds(skew);
            return Instant.ofEpochSecond(expSeconds).isBefore(adjustedCurrentTime);
        }
        return true;
    }

    private String resolvePrimaryAuthority(Collection<? extends GrantedAuthority> authorities) {
        if (authorities == null || authorities.isEmpty())
            return null;
        return authorities.iterator().next().getAuthority();
    }

    private String base64Url(byte[] bytes) {
        return BASE64_URL_ENCODER.encodeToString(bytes);
    }

    private String asString(Object obj) {
        return obj instanceof String ? (String) obj : null;
    }

    private byte[] serializeClaims(Map<String, Object> claims) {
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Object> entry : claims.entrySet()) {
            if (!first)
                sb.append(",");
            first = false;
            sb.append("\"").append(entry.getKey()).append("\":");
            Object val = entry.getValue();
            if (val instanceof String) {
                sb.append("\"").append(val).append("\"");
            } else {
                sb.append(val);
            }
        }
        sb.append("}");
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private Map<String, Object> parseJson(String json) {
        Map<String, Object> map = new LinkedHashMap<>();
        Matcher matcher = JSON_FIELD_PATTERN.matcher(json);
        while (matcher.find()) {
            String key = matcher.group(1);
            String valueStr = matcher.group(2);
            if (valueStr.startsWith("\"")) {
                map.put(key, matcher.group(3));
            } else if (valueStr.equals("true")) {
                map.put(key, true);
            } else if (valueStr.equals("false")) {
                map.put(key, false);
            } else if (valueStr.equals("null")) {
                map.put(key, null);
            } else {
                try {
                    map.put(key, Long.parseLong(valueStr));
                } catch (NumberFormatException e) {
                    map.put(key, Double.parseDouble(valueStr));
                }
            }
        }
        return map;
    }
}
