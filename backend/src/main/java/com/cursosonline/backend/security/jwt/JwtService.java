package com.cursosonline.backend.security.jwt;

import com.cursosonline.backend.config.jwt.JwtProperties;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final Clock clock;

    /**
     * Constructor de la clase JwtService.
     * 
     * @param jwtProperties Las propiedades de configuración de JWT.
     */
    @Autowired
    public JwtService(JwtProperties jwtProperties) {
        this(jwtProperties, Clock.systemUTC());
    }

    /**
     * Constructor de la clase JwtService con inyección de reloj para pruebas.
     * 
     * @param jwtProperties Las propiedades de configuración de JWT.
     * @param clock         El reloj a utilizar para la generación y validación de
     *                      tokens.
     */
    public JwtService(JwtProperties jwtProperties, Clock clock) {
        this.jwtProperties = jwtProperties;
        this.clock = clock != null ? clock : Clock.systemUTC();
    }

    /**
     * Genera un Access Token JWT firmado con HS256.
     * 
     * @param userDetails Los detalles del usuario para el cual se genera el token.
     * @param userId      El ID del usuario.
     * @param email       El correo electrónico del usuario.
     * @return El Access Token JWT generado.
     */
    public String generateAccessToken(UserDetails userDetails, Long userId, String email) {
        return generateToken(userDetails, ACCESS_TOKEN_TYPE, accessTokenTtl(), userId, email);
    }

    /**
     * Genera un Refresh Token JWT firmado con HS256.
     * 
     * @param userDetails Los detalles del usuario para el cual se genera el token.
     * @param userId      El ID del usuario.
     * @param email       El correo electrónico del usuario.
     * @return El Refresh Token JWT generado.
     */
    public String generateRefreshToken(UserDetails userDetails, Long userId, String email) {
        return generateToken(userDetails, REFRESH_TOKEN_TYPE, refreshTokenTtl(), userId, email);
    }

    /**
     * Extrae el nombre de usuario (claim "sub") de un token JWT.
     * 
     * @param token El token JWT del cual se extrae el nombre de usuario.
     * @return El nombre de usuario contenido en el claim "sub" del token.
     */
    public String extractUsername(String token) {
        return getClaim(token, "sub", String.class);
    }

    /**
     * Extrae el tipo de token (claim "tokenType") de un token JWT.
     * 
     * @param token El token JWT del cual se extrae el tipo.
     * @return El tipo de token contenido en el claim "tokenType" del token.
     */
    public String extractTokenType(String token) {
        return getClaim(token, "tokenType", String.class);
    }

    /**
     * Extrae el rol del usuario (claim "role") de un token JWT.
     * 
     * @param token El token JWT del cual se extrae el rol.
     * @return El rol del usuario contenido en el claim "role" del token.
     */
    public String extractRole(String token) {
        return getClaim(token, "role", String.class);
    }

    /**
     * Extrae la fecha de expiración (claim "exp") de un token JWT como un objeto
     * Instant.
     * 
     * @param token El token JWT del cual se extrae la fecha de expiración.
     * @return La fecha de expiración contenida en el claim "exp" del token como un
     *         objeto Instant.
     */
    public Instant extractExpiration(String token) {
        Long exp = getClaim(token, "exp", Long.class);
        return exp == null ? null : Instant.ofEpochSecond(exp);
    }

    /**
     * Extrae el ID de usuario (claim "userId") de un token JWT.
     * 
     * @param token El token JWT del cual se extrae el ID de usuario.
     * @return El ID de usuario contenido en el claim "userId" del token.
     */
    public Long extractUserId(String token) {
        return getClaim(token, "userId", Long.class);
    }

    /**
     * Extrae el ID único del token (claim "jti") de un token JWT.
     * 
     * @param token El token JWT del cual se extrae el ID único.
     * @return El ID único contenido en el claim "jti" del token.
     */
    public String extractJti(String token) {
        return getClaim(token, "jti", String.class);
    }

    /**
     * Valida un token JWT verificando su firma y asegurándose de que no esté
     * expirado.
     * 
     * @param token El token JWT a validar.
     * @return true si el token es válido, false en caso contrario.
     */
    public boolean isTokenValid(String token) {
        try {
            Map<String, Object> claims = parseAndVerify(token);
            String username = asString(claims.get("sub"));
            return username != null && !isExpired(claims);
        } catch (RuntimeException ex) {
            return false;
        }
    }

    /**
     * Valida un token JWT verificando su firma, asegurándose de que no esté
     * expirado y comparando el nombre de usuario con los detalles del usuario
     * proporcionados.
     * 
     * @param token       El token JWT a validar.
     * @param userDetails Los detalles del usuario con los cuales se compara el
     *                    nombre de usuario del token.
     * @return true si el token es válido y coincide con los detalles del usuario,
     *         false en caso contrario.
     */
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

    /**
     * Extrae el tipo de token (claim "tokenType") de un token JWT, devolviendo null
     * si ocurre algún error durante la extracción.
     * 
     * @param token El token JWT del cual se intenta extraer el tipo.
     * @return El tipo de token contenido en el claim "tokenType" del token, o null
     *         si ocurre algún error durante la extracción.
     */
    public String extractTokenTypeOrNull(String token) {
        try {
            return extractTokenType(token);
        } catch (RuntimeException ex) {
            return null;
        }
    }

    /**
     * Genera un token JWT firmado con HS256, incluyendo los claims necesarios.
     * 
     * @param userDetails Los detalles del usuario para el cual se genera el token.
     * @param tokenType   El tipo de token (por ejemplo, "access" o "refresh").
     * @param ttl         El tiempo de vida del token.
     * @param userId      El ID del usuario.
     * @param email       El correo electrónico del usuario.
     * @return El token JWT generado como una cadena.
     */
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

    /**
     * Calcula la duración del tiempo de vida del access token en base a la
     * configuración.
     * 
     * @return La duración del tiempo de vida del access token.
     */
    private Duration accessTokenTtl() {
        return Duration.ofMinutes(jwtProperties.getAccessTokenExpirationMinutes());
    }

    /**
     * Calcula la duración del tiempo de vida del refresh token en base a la
     * configuración.
     * 
     * @return La duración del tiempo de vida del refresh token.
     */
    private Duration refreshTokenTtl() {
        return Duration.ofDays(jwtProperties.getRefreshTokenExpirationDays());
    }

    /**
     * Firma el contenido del token utilizando HMAC-SHA256 con la clave secreta
     * configurada.
     * 
     * @param signingInput El contenido del token que se va a firmar.
     * @return La firma HMAC-SHA256 del contenido del token.
     */
    private byte[] sign(String signingInput) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo firmar el JWT", ex);
        }
    }

    /**
     * Parsea y verifica un token JWT, asegurándose de que tenga un formato válido y
     * que la firma sea correcta.
     * 
     * @param token El token JWT que se va a parsear y verificar.
     * @return Un mapa con los claims contenidos en el token.
     */
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

    /**
     * Extrae un claim específico de un token JWT y lo convierte al tipo deseado.
     * Si el claim no existe o no se puede convertir, devuelve null.
     * 
     * @param <T>      El tipo al cual se desea convertir el claim.
     * @param token    El token JWT del cual se extraerá el claim.
     * @param claimKey La clave del claim a extraer.
     * @param type     La clase del tipo al cual se desea convertir el claim.
     * @return El valor del claim convertido al tipo especificado, o null si no
     *         existe o no se puede convertir.
     */
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

    /**
     * Verifica si un token JWT ha expirado basándose en el claim "exp" y el clock
     * skew configurado.
     * 
     * @param claims El mapa de claims del token JWT.
     * @return true si el token ha expirado, false en caso contrario.
     */
    private boolean isExpired(Map<String, Object> claims) {
        Object expObj = claims.get("exp");
        if (expObj instanceof Number) {

            long expSeconds = ((Number) expObj).longValue();
            long skew = jwtProperties.getClockSkewSeconds();

            // [CORRECCIÓN CRÍTICA DE AUDITORÍA]: Para otorgar un margen de gracia de 60s,
            // restamos la tolerancia al tiempo del servidor actual antes de evaluar el
            // vencimiento.
            Instant adjustedCurrentTime = Instant.now(clock).minusSeconds(skew);

            // El token está verdaderamente expirado si su vencimiento es anterior al tiempo
            // actual ajustado
            return Instant.ofEpochSecond(expSeconds).isBefore(adjustedCurrentTime);
        }
        return true; // Si no hay propiedad de expiración, se rechaza por seguridad
    }

    /**
     * Resuelve la autoridad principal de un conjunto de GrantedAuthority.
     * Si no hay autoridades, devuelve null.
     * 
     * @param authorities La colección de GrantedAuthority.
     * @return La autoridad principal como String, o null si no hay autoridades.
     */
    private String resolvePrimaryAuthority(Collection<? extends GrantedAuthority> authorities) {
        if (authorities == null || authorities.isEmpty())
            return null;
        return authorities.iterator().next().getAuthority();
    }

    /**
     * Codifica un arreglo de bytes en una cadena Base64 URL-safe sin padding.
     * 
     * @param bytes El arreglo de bytes a codificar.
     * @return La cadena codificada en Base64 URL-safe sin padding.
     */
    private String base64Url(byte[] bytes) {
        return BASE64_URL_ENCODER.encodeToString(bytes);
    }

    /**
     * Convierte un objeto a String si es una instancia de String, de lo contrario
     * devuelve null.
     * 
     * @param obj El objeto a convertir.
     * @return La cadena resultante si el objeto es una instancia de String, o null
     *         en caso contrario.
     */
    private String asString(Object obj) {
        return obj instanceof String ? (String) obj : null;
    }

    /**
     * Serializa un mapa de claims a una cadena JSON y luego a un arreglo de bytes.
     * 
     * @param claims El mapa de claims a serializar.
     * @return El arreglo de bytes resultante de la serialización JSON.
     */
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

    /**
     * Parsea una cadena JSON simple a un mapa de claims.
     * Este método es un parser muy básico y no soporta estructuras complejas.
     * 
     * @param json La cadena JSON a parsear.
     * @return Un mapa de claims extraído de la cadena JSON.
     */
    private Map<String, Object> parseJson(String json) {
        Map<String, Object> map = new LinkedHashMap<>();
        Matcher matcher = JSON_FIELD_PATTERN.matcher(json);
        while (matcher.find()) {
            String key = matcher.group(1);
            String valueStr = matcher.group(2).trim(); // Añadido trim() preventivo para limpiar el parseo manual
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
