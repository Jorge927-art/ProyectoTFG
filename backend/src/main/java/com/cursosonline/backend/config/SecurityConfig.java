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

@Configuration
@EnableWebSecurity
/**
 * Clase de configuración de seguridad para la aplicación.
 * Configura la seguridad HTTP, CORS, CSRF, gestión de sesiones y filtros de
 * autenticación.
 */
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    /**
     * Constructor de la clase SecurityConfig.
     * 
     * @param jwtAuthenticationFilter Filtro interceptor del token JWT
     */
    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    /**
     * Configura la cadena de filtros de seguridad para la aplicación.
     * 
     * @param http Componente inyectado de HttpSecurity
     * @return La cadena de filtros configurada
     * @throws Exception Si ocurre un error de configuración
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())

                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth

                        // Permitir solicitudes OPTIONS para CORS preflight
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Rutas públicas para subidas de archivos
                        .requestMatchers("/uploads/**").permitAll()

                        // Endpoints de autenticación pública (login y registro)
                        .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/{username}").permitAll()

                        // 🚨 CONTROL DE ACCESO CRÍTICO: NUEVOS ENDPOINTS DE CURSOS Y MATRÍCULAS
                        // Permitimos el acceso para que el buscador predictivo funcione en tiempo real
                        .requestMatchers(HttpMethod.GET, "/api/courses/search").permitAll()
                        // Protegemos la matrícula exigiendo obligatoriamente sesión activa (JWT)
                        .requestMatchers(HttpMethod.POST, "/api/courses/enroll/**").authenticated()

                        // Endpoint para obtener el perfil del usuario autenticado (requiere
                        // autenticación)
                        .requestMatchers("/api/auth/me").authenticated()

                        // Endpoint para obtener el perfil de un usuario específico (requiere
                        // autenticación)
                        .requestMatchers("/api/v1/profile/**").authenticated()

                        // Exclusivo Administrador
                        .requestMatchers("/api/auth/users/**").hasAuthority("ADMIN")
                        .requestMatchers("/api/admin/**").hasAuthority("ADMIN")
                        .requestMatchers("/api/users/**").hasAuthority("ADMIN")

                        // Exclusivo Profesor y Administrador
                        .requestMatchers("/api/professor/**").hasAnyAuthority("PROFESSOR", "ADMIN")
                        .requestMatchers("/api/student/**").hasAnyAuthority("STUDENT", "ADMIN")

                        // Cualquier otra solicitud requiere autenticación
                        .anyRequest().authenticated())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable());

        // Agrega el filtro de autenticación JWT antes del filtro estándar de Spring
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Configura la fuente de configuración CORS para la aplicación.
     * 
     * @return La fuente de configuración CORS configurada.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /**
     * Configura el codificador de contraseñas para la aplicación.
     * 
     * @return El codificador de contraseñas configurado.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Configura el administrador de autenticación para la aplicación.
     * 
     * @param configuration La configuración de autenticación.
     * @return El administrador de autenticación configurado.
     * @throws Exception si ocurre un error al obtener el administrador de
     *                   autenticación.
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }
}
