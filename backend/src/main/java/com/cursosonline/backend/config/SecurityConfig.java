package com.cursosonline.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Clase de configuración de seguridad para la aplicación. Define las reglas de
 * acceso
 * a las diferentes rutas de la API según los roles de usuario (ADMIN,
 * PROFESSOR, STUDENT).
 * Configura CORS para permitir solicitudes desde el frontend (React/Vite) y
 * establece el uso de BCrypt para el cifrado de contraseñas. Esta configuración
 * es esencial para proteger los endpoints de la API y garantizar que solo los
 * usuarios autorizados puedan acceder a ciertas funcionalidades.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    /**
     * Configura la cadena de seguridad HTTP, definiendo las reglas de acceso a los
     * endpoints de la API según los roles de usuario. Permite el acceso libre a las
     * rutas de autenticación y registro.
     * 
     * @param http
     * @return
     * @throws Exception
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // Integrar CORS en la cadena de seguridad
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable()) // Deshabilitado para facilitar el desarrollo con APIs REST
                .authorizeHttpRequests(auth -> auth
                        // Control de acceso por perfiles según los requisitos
                        .requestMatchers("/api/auth/**").permitAll() // Permitir login y registro
                        .requestMatchers("/api/admin/**").hasAuthority("ADMIN")
                        .requestMatchers("/api/profesor/**").hasAuthority("PROFESSOR")
                        .requestMatchers("/api/estudiante/**").hasAuthority("STUDENT")
                        .anyRequest().authenticated())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable());

        return http.build();
    }

    /**
     * Configura CORS para permitir solicitudes desde el frontend (React/Vite) que
     * se
     * conectan al backend (Spring Boot). Define los orígenes permitidos, métodos
     * HTTP y encabezados. Esto es esencial para evitar problemas de CORS al
     * consumir la API desde el frontend durante el desarrollo.
     * 
     * @return
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173")); // Origen del frontend (React/Vite)
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /**
     * Bean para el cifrado de contraseñas utilizando BCrypt. Este encoder se
     * utiliza
     * en el servicio de usuarios para cifrar las contraseñas antes de almacenarlas
     * 
     * @return
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
