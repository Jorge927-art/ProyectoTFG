package com.cursosonline.backend.security.jwt;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Filtro de autenticación JWT de alto rendimiento y libre de duplicidades.
 * Bloquea y rechaza inmediatamente peticiones con tokens caducados o inválidos
 * (401).
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;

        // Si no se suministra un token Bearer, delegamos a la cadena estándar (para
        // rutas públicas)
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);

        try {
            // 1. Validar criptografía y EXPIRACIÓN de forma estricta primero
            if (!jwtService.isTokenValid(jwt)) {
                // BLINDAJE TFG: Si el token ha expirado, cortamos la petición aquí mismo con un
                // 401
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\": \"Token expirado o inválido. Acceso denegado.\"}");
                return; // Corta la cadena de filtros por completo
            }

            username = jwtService.extractUsername(jwt);

            // Si el contexto de seguridad actual se encuentra libre
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                String role = jwtService.extractRole(jwt);

                // Reconstruimos la lista de autoridades autorizadas usando el rol del token
                List<SimpleGrantedAuthority> authorities = (role != null)
                        ? List.of(new SimpleGrantedAuthority(role))
                        : List.of();

                // Instanciamos un UserDetails virtual ligero en memoria
                UserDetails userDetails = new User(username, "", authorities);

                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // Establecemos la identidad en el contexto de Spring Security
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }

        } catch (Exception ex) {
            // Salvaguarda: Si ocurre un fallo inesperado, limpiamos el contexto y
            // rechazamos
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Error de autenticación criptográfica.\"}");
            return;
        }

        // Solo si el token es 100% válido permitimos continuar hacia los controladores
        filterChain.doFilter(request, response);
    }
}
