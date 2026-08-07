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

    private static final String ACCESS_TOKEN_TYPE = "access";

    private final JwtService jwtService;

    /**
     * Constructor de la clase JwtAuthenticationFilter.
     * 
     * @param jwtService
     */
    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    /**
     * (non-Javadoc)
     * 
     * @see org.springframework.web.filter.OncePerRequestFilter#doFilterInternal(jakarta.servlet.http.HttpServletRequest,
     *      jakarta.servlet.http.HttpServletResponse, jakarta.servlet.FilterChain)
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;

        // Si no hay encabezado de autorización o no comienza con "Bearer ",
        // continuamos con la cadena de filtros sin autenticar
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Extraemos el token JWT del encabezado Authorization
        jwt = authHeader.substring(7);

        try {
            // Validamos el token JWT y extraemos el nombre de usuario
            if (!jwtService.isTokenValid(jwt)) {
                // Si el token es inválido o ha expirado, respondemos con 401 Unauthorized
                SecurityContextHolder.clearContext();
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\": \"Token expirado o inválido. Acceso denegado.\"}");
                return;
            }

            String tokenType = jwtService.extractTokenTypeOrNull(jwt);
            if (!ACCESS_TOKEN_TYPE.equals(tokenType)) {
                SecurityContextHolder.clearContext();
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\": \"Tipo de token no permitido para autorización.\"}");
                return;
            }

            // Extraemos el nombre de usuario del token JWT
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

        filterChain.doFilter(request, response);
    }
}
