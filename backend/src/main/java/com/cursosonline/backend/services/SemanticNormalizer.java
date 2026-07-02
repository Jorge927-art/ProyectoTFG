package com.cursosonline.backend.services;

import org.springframework.stereotype.Component;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import java.util.Objects;

@Component
public class SemanticNormalizer {

    // Diccionario de Tokens Semánticos para las 11 Categorías del Catálogo Híbrido
    private static final Map<String, String> CATEGORY_TOKENS = new HashMap<>();

    static {
        // 1. Ciencia de Datos
        registerCategory("DATA_SCIENCE", "data science", "ciencia de datos", "データサイエンス", "aprendizaje automático",
                "machine learning");
        // 2. Negocios
        registerCategory("BUSINESS", "business", "negocios", "negócios", "finanzas", "marketing");
        // 3. Tecnología de la Información
        registerCategory("IT", "information technology", "tecnologia da informação", "tecnología de la información");
        // 4. Ciencias de la Computación
        registerCategory("COMPUTER_SCIENCE", "computer science", "ciencias de la computación",
                "ciência de la computação");
        // 5. Artes y Humanidades
        registerCategory("ARTS_HUMANITIES", "arts and humanities", "artes y humanidades", "artes e humanidades");
        // 6. Aprendizaje de Idiomas
        registerCategory("LANGUAGE_LEARNING", "language learning", "aprendizaje de idiomas", "aprendizado de idiomas");
        // 7. Desarrollo Personal
        registerCategory("PERSONAL_DEVELOPMENT", "personal development", "desarrollo personal",
                "desenvolvimento pessoal");
        // 8. Salud
        registerCategory("HEALTH", "health", "salud", "saúde");
        // 9. Ciencias Sociales
        registerCategory("SOCIAL_SCIENCES", "social sciences", "ciencias sociales", "ciências sociais");
        // 10. Ciencias Físicas e Ingeniería
        registerCategory("PHYSICAL_SCIENCE_ENG", "physical science and engineering", "ciencias físicas e ingeniería",
                "ciências físicas e engenharia");
        // 11. Matemáticas y Lógica
        registerCategory("MATH_LOGIC", "math and logic", "matemáticas y lógica", "matemática e lógica");
    }

    private static void registerCategory(String token, String... variants) {
        for (String variant : variants) {
            CATEGORY_TOKENS.put(variant.toLowerCase().trim(), token);
        }
    }

    /**
     * Resuelve el token semántico de una categoría individual (catálogo o UI).
     */
    public String normalizeCategory(String category) {
        if (category == null || category.isBlank())
            return "UNKNOWN";
        String clean = category.toLowerCase().trim();
        return CATEGORY_TOKENS.getOrDefault(clean, "GENERIC_" + clean.replaceAll("\\s+", "_").toUpperCase());
    }

    /**
     * Transforma una colección de intereses del estudiante en un Set de Tokens
     * Semánticos.
     */
    public Set<String> normalizeCategories(Iterable<String> categories) {
        if (categories == null)
            return Collections.emptySet();
        return StreamSupport.stream(categories.spliterator(), false)
                .filter(Objects::nonNull)
                .map(this::normalizeCategory)
                .collect(Collectors.toSet());
    }

    /**
     * Mapeo de niveles/tipos de curso a tokens normalizados estándar.
     * Añadido soporte para comodín universal "Todos los niveles".
     */
    public String normalizeLevel(String level) {
        if (level == null || level.isBlank())
            return "UNKNOWN";
        String clean = level.toLowerCase().trim();

        // CORRECCIÓN: Captura la opción global del modal de Luis
        if (clean.contains("todos") || clean.contains("all"))
            return "ALL_LEVELS";

        if (clean.contains("principiante") || clean.contains("begin") || clean.contains("inici"))
            return "BEGINNER";
        if (clean.contains("intermed") || clean.contains("medium"))
            return "INTERMEDIATE";
        if (clean.contains("avanz") || clean.contains("advanced") || clean.contains("expert"))
            return "ADVANCED";
        return clean.toUpperCase();
    }

    public Set<String> normalizeLevels(Iterable<String> levels) {
        if (levels == null)
            return Collections.emptySet();
        return StreamSupport.stream(levels.spliterator(), false)
                .filter(Objects::nonNull)
                .map(this::normalizeLevel)
                .collect(Collectors.toSet());
    }

    /**
     * Mapeo semántico para idiomas y subtítulos de traducción.
     * CORRECCIÓN: Retorna cadenas en minúsculas para garantizar compatibilidad
     * exacta
     * con los métodos .contains() del motor de emparejamiento. Añadido soporte para
     * Francés.
     */
    public String normalizeLanguage(String lang) {
        if (lang == null || lang.isBlank())
            return "unknown";
        String clean = lang.toLowerCase().trim();
        if (clean.contains("esp") || clean.contains("spa"))
            return "spanish";
        if (clean.contains("ing") || clean.contains("eng"))
            return "english";
        if (clean.contains("por") || clean.contains("pt"))
            return "portuguese";
        if (clean.contains("jap") || clean.contains("jp"))
            return "japanese";
        if (clean.contains("fra") || clean.contains("fre"))
            return "french"; // CORRECCIÓN: Mapeo del nuevo interés de Luis
        return clean;
    }

    public Set<String> normalizeLanguages(Iterable<String> languages) {
        if (languages == null)
            return Collections.emptySet();
        return StreamSupport.stream(languages.spliterator(), false)
                .filter(Objects::nonNull)
                .map(this::normalizeLanguage)
                .collect(Collectors.toSet());
    }
}
