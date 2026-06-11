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
 *
 * Mantiene la lógica de codificación, verificación de firma y expiración
 * separada del resto de la seguridad para facilitar la Fase 1 de la migración.
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

    public String generateAccessToken(UserDetails userDetails) {
        return generateToken(userDetails, ACCESS_TOKEN_TYPE, accessTokenTtl());
    }

    public String generateRefreshToken(UserDetails userDetails) {
        return generateToken(userDetails, REFRESH_TOKEN_TYPE, refreshTokenTtl());
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
        return isTokenValid(token, null);
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            Map<String, Object> claims = parseAndVerify(token);
            String username = asString(claims.get("sub"));
            if (username == null || isExpired(claims)) {
                return false;
            }

            if (userDetails != null && !username.equals(userDetails.getUsername())) {
                return false;
            }

            return true;
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

    private String generateToken(UserDetails userDetails, String tokenType, Duration ttl) {
        Instant issuedAt = Instant.now(clock);
        Instant expiresAt = issuedAt.plus(ttl);

        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("iss", jwtProperties.getIssuer());
        claims.put("sub", userDetails.getUsername());
        claims.put("iat", issuedAt.getEpochSecond());
        claims.put("exp", expiresAt.getEpochSecond());
        claims.put("tokenType", tokenType);
        claims.put("jti", UUID.randomUUID().toString());

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
            throw new IllegalArgumentException("Firma JWT inválida");
        }

        String payloadJson = new String(BASE64_URL_DECODER.decode(parts[1]), StandardCharsets.UTF_8);
        return parseClaims(payloadJson);
    }

    private boolean isExpired(Map<String, Object> claims) {
        Long exp = asLong(claims.get("exp"));
        if (exp == null) {
            return true;
        }

        Instant expiration = Instant.ofEpochSecond(exp);
        Instant now = Instant.now(clock).minusSeconds(jwtProperties.getClockSkewSeconds());
        return now.isAfter(expiration);
    }

    private <T> T getClaim(String token, String claimName, Class<T> type) {
        Map<String, Object> claims = parseAndVerify(token);
        Object value = claims.get(claimName);
        if (value == null) {
            return null;
        }

        if (type.isInstance(value)) {
            return type.cast(value);
        }

        if (type == Long.class) {
            return type.cast(asLong(value));
        }

        if (type == Integer.class) {
            Long numericValue = asLong(value);
            return numericValue == null ? null : type.cast(numericValue.intValue());
        }

        return type.cast(value.toString());
    }

    private byte[] serializeClaims(Map<String, Object> claims) {
        return toJson(claims).getBytes(StandardCharsets.UTF_8);
    }

    private Map<String, Object> parseClaims(String json) {
        String trimmed = json.trim();
        if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
            throw new IllegalArgumentException("Contenido JWT inválido");
        }

        Map<String, Object> claims = new LinkedHashMap<>();
        Matcher matcher = JSON_FIELD_PATTERN.matcher(trimmed);
        int lastEnd = 1;
        while (matcher.find()) {
            String between = trimmed.substring(lastEnd, matcher.start()).trim();
            if (!between.isEmpty() && !",".equals(between)) {
                throw new IllegalArgumentException("Contenido JWT inválido");
            }

            String key = unescapeJson(matcher.group(1));
            String rawValue = matcher.group(2);
            claims.put(key, parseJsonValue(rawValue, matcher.group(3)));
            lastEnd = matcher.end();
        }

        String tail = trimmed.substring(lastEnd, trimmed.length() - 1).trim();
        if (!tail.isEmpty()) {
            throw new IllegalArgumentException("Contenido JWT inválido");
        }

        return claims;
    }

    private Object parseJsonValue(String rawValue, String stringContent) {
        if (rawValue.startsWith("\"")) {
            return unescapeJson(stringContent);
        }

        if ("true".equals(rawValue) || "false".equals(rawValue)) {
            return Boolean.parseBoolean(rawValue);
        }

        if ("null".equals(rawValue)) {
            return null;
        }

        return Long.parseLong(rawValue);
    }

    private String toJson(Map<String, Object> claims) {
        StringBuilder builder = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Object> entry : claims.entrySet()) {
            if (!first) {
                builder.append(',');
            }
            builder.append('"').append(escapeJson(entry.getKey())).append('"').append(':')
                    .append(formatJsonValue(entry.getValue()));
            first = false;
        }
        return builder.append('}').toString();
    }

    private String formatJsonValue(Object value) {
        if (value == null) {
            return "null";
        }

        if (value instanceof Number || value instanceof Boolean) {
            return value.toString();
        }

        return '"' + escapeJson(value.toString()) + '"';
    }

    private String escapeJson(String value) {
        StringBuilder builder = new StringBuilder(value.length());
        for (char character : value.toCharArray()) {
            switch (character) {
                case '\\' -> builder.append("\\\\");
                case '"' -> builder.append("\\\"");
                case '\b' -> builder.append("\\b");
                case '\f' -> builder.append("\\f");
                case '\n' -> builder.append("\\n");
                case '\r' -> builder.append("\\r");
                case '\t' -> builder.append("\\t");
                default -> {
                    if (character < 0x20) {
                        builder.append(String.format("\\u%04x", (int) character));
                    } else {
                        builder.append(character);
                    }
                }
            }
        }
        return builder.toString();
    }

    private String unescapeJson(String value) {
        StringBuilder builder = new StringBuilder(value.length());
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            if (character != '\\') {
                builder.append(character);
                continue;
            }

            if (index + 1 >= value.length()) {
                throw new IllegalArgumentException("Contenido JWT inválido");
            }

            char escaped = value.charAt(++index);
            switch (escaped) {
                case '"' -> builder.append('"');
                case '\\' -> builder.append('\\');
                case '/' -> builder.append('/');
                case 'b' -> builder.append('\b');
                case 'f' -> builder.append('\f');
                case 'n' -> builder.append('\n');
                case 'r' -> builder.append('\r');
                case 't' -> builder.append('\t');
                case 'u' -> {
                    if (index + 4 >= value.length()) {
                        throw new IllegalArgumentException("Contenido JWT inválido");
                    }
                    String hex = value.substring(index + 1, index + 5);
                    builder.append((char) Integer.parseInt(hex, 16));
                    index += 4;
                }
                default -> throw new IllegalArgumentException("Contenido JWT inválido");
            }
        }
        return builder.toString();
    }

    private String base64Url(byte[] value) {
        return BASE64_URL_ENCODER.encodeToString(value);
    }

    private String resolvePrimaryAuthority(Collection<? extends GrantedAuthority> authorities) {
        if (authorities == null || authorities.isEmpty()) {
            return null;
        }

        return authorities.iterator().next().getAuthority();
    }

    private String asString(Object value) {
        return value == null ? null : value.toString();
    }

    private Long asLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }

        if (value == null) {
            return null;
        }

        return Long.parseLong(value.toString());
    }
}