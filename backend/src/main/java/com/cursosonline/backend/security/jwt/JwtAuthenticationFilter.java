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
 * Extrae y valida la identidad y roles directamente desde el Token en memoria,
 * eliminando las consultas redundantes a PostgreSQL en cada petición HTTP.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    // Inyección limpia del servicio de tokens
    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;

        // Si no se suministra un token Bearer válido, delegamos a la cadena estándar
        // (Stateless)
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);

        try {
            username = jwtService.extractUsername(jwt);

            // Si el token es válido y el contexto de seguridad actual se encuentra libre
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                // 🔴 RENDIMIENTO PURO JWT: Extraemos el rol guardado en el token sin golpear la
                // BBDD
                String role = jwtService.extractRole(jwt);

                // Si el token es estructural y criptográficamente válido
                if (jwtService.isTokenValid(jwt)) {

                    // Reconstruimos la lista de autoridades autorizadas usando el rol del token
                    List<SimpleGrantedAuthority> authorities = (role != null)
                            ? List.of(new SimpleGrantedAuthority(role))
                            : List.of();

                    // Instanciamos un UserDetails virtual ligero en memoria
                    UserDetails userDetails = new User(username, "", authorities);

                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    // Establecemos la identidad en el contexto de Spring Security para el ciclo de
                    // vida de esta petición
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception ex) {
            // Salvaguarda: Si el token está corrupto o mal firmado, limpiamos el contexto
            SecurityContextHolder.clearContext();
        }

        // Continuamos la cadena de filtros de forma limpia
        filterChain.doFilter(request, response);
    }
}
