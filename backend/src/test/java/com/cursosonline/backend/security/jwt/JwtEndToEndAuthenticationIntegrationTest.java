package com.cursosonline.backend.security.jwt;

import com.cursosonline.backend.config.jwt.JwtProperties;
import com.cursosonline.backend.dto.AdminGlobalStatisticsDTO;
import com.cursosonline.backend.services.AdminGlobalStatisticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@DisplayName("JWT E2E Authentication - Integración con Header Authorization real")
class JwtEndToEndAuthenticationIntegrationTest {

    private static final String HMAC_ALGORITHM = "HmacSHA256";

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private JwtProperties jwtProperties;

    @MockitoBean
    private AdminGlobalStatisticsService adminGlobalStatisticsService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        // Fallback defensivo: si por error una petición inválida llegara al
        // controlador,
        // evitamos ruido de dependencias y mantenemos determinismo del test.
        when(adminGlobalStatisticsService.getGlobalStatistics()).thenReturn(
                new AdminGlobalStatisticsDTO(2026, 0, 0, List.of(), List.of()));
    }

    @Test
    @DisplayName("Sin header Authorization debe devolver el código real de rechazo del pipeline de seguridad")
    void shouldRejectRequestWithoutAuthorizationHeader() throws Exception {
        int statusCode = mockMvc.perform(get("/api/admin/statistics/global")
                .contentType(MediaType.APPLICATION_JSON))
                .andReturn()
                .getResponse()
                .getStatus();

        assertTrue(statusCode == 401 || statusCode == 403,
                "Sin credenciales, el pipeline de seguridad debe rechazar con 401 o 403");
        verifyNoInteractions(adminGlobalStatisticsService);
    }

    @Test
    @DisplayName("Token con firma alterada debe devolver 401 explícito")
    void shouldReturn401ForCorruptedSignatureToken() throws Exception {
        long now = Instant.now().getEpochSecond();
        String validToken = createHs256Token("admin_e2e", "ADMIN", now + 600);
        String corruptedToken = corruptTokenSignature(validToken);

        mockMvc.perform(get("/api/admin/statistics/global")
                .header("Authorization", "Bearer " + corruptedToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string(containsString("Token expirado o inválido")));

        verifyNoInteractions(adminGlobalStatisticsService);
    }

    @Test
    @DisplayName("Token válido estructuralmente pero caducado debe devolver 401 explícito")
    void shouldReturn401ForTrulyExpiredToken() throws Exception {
        long now = Instant.now().getEpochSecond();
        long expiredBeyondSkew = now - jwtProperties.getClockSkewSeconds() - 120;

        String expiredToken = createHs256Token("admin_e2e", "ADMIN", expiredBeyondSkew);

        mockMvc.perform(get("/api/admin/statistics/global")
                .header("Authorization", "Bearer " + expiredToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string(containsString("Token expirado o inválido")));

        verifyNoInteractions(adminGlobalStatisticsService);
    }

    private String createHs256Token(String username, String role, long expEpochSeconds) throws Exception {
        long issuedAt = expEpochSeconds - 300;
        String headerJson = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        String payloadJson = "{"
                + "\"iss\":\"" + jwtProperties.getIssuer() + "\","
                + "\"sub\":\"" + username + "\","
                + "\"iat\":" + issuedAt + ","
                + "\"exp\":" + expEpochSeconds + ","
                + "\"tokenType\":\"access\","
                + "\"jti\":\"" + UUID.randomUUID() + "\","
                + "\"role\":\"" + role + "\""
                + "}";

        String header = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(headerJson.getBytes(StandardCharsets.UTF_8));
        String payload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));

        String signingInput = header + "." + payload;

        Mac mac = Mac.getInstance(HMAC_ALGORITHM);
        mac.init(new SecretKeySpec(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
        byte[] signature = mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8));

        String signaturePart = Base64.getUrlEncoder().withoutPadding().encodeToString(signature);
        return signingInput + "." + signaturePart;
    }

    private String corruptTokenSignature(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            return token + "corrupted";
        }

        byte[] signature = Base64.getUrlDecoder().decode(parts[2]);
        if (signature.length == 0) {
            return token + "corrupted";
        }

        // Alteración determinista de bytes reales para invalidar firma.
        signature[0] = (byte) (signature[0] ^ 0x01);
        String corruptedSignature = Base64.getUrlEncoder().withoutPadding().encodeToString(signature);

        return parts[0] + "." + parts[1] + "." + corruptedSignature;
    }
}
