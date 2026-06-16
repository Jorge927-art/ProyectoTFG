package com.cursosonline.backend.config;

import com.cursosonline.backend.security.jwt.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Clase de configuración de seguridad optimizada para la aplicación.
 * Implementa un modelo puro Stateless basado al 100% en tokens JWT,
 * eliminando duplicidades y residuos del sistema de sesiones HTTP.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    // Inyección limpia del filtro administrado por Spring como componente
    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    /**
     * Configura la cadena de seguridad HTTP en modo estricto STATELESS.
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable()) // Deshabilitado para APIs REST Stateless

                // SEGURIDAD PURA JWT: El servidor ya no guarda estados de sesión bajo ningún
                // concepto
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Endpoints públicos de autenticación y búsqueda base de usuarios
                        .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/{username}").permitAll()

                        // Endpoint para obtener información del usuario autenticado
                        .requestMatchers("/api/auth/me").authenticated()

                        // EXCLUSIVO ADMINISTRADOR: Asegura el endpoint de cambio de rol
                        // /api/auth/users/**
                        .requestMatchers("/api/auth/users/**").hasAuthority("ADMIN")
                        .requestMatchers("/api/admin/**").hasAuthority("ADMIN")
                        .requestMatchers("/api/users/**").hasAuthority("ADMIN")

                        // Rutas protegidas para profesores y administradores
                        .requestMatchers("/api/professor/**").hasAnyAuthority("PROFESSOR", "ADMIN")
                        // Rutas protegidas para estudiantes y administradores
                        .requestMatchers("/api/student/**").hasAnyAuthority("STUDENT", "ADMIN")

                        // Cualquier otra solicitud requiere autenticación
                        .anyRequest().authenticated())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable());

        // Registramos el filtro JWT limpio antes del filtro de credenciales estándar
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Configura CORS permitiendo solicitudes asíncronas completas desde React.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173"));

        // Agregado "PATCH" para permitir los cambios parciales de rol desde el frontend
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /**
     * Bean para el cifrado de contraseñas utilizando BCrypt.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }
}
