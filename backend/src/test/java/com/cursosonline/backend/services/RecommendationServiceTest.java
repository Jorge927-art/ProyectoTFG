package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.RecommendationDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Interest;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.InterestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecommendationServiceTest {

        @Mock
        private CoursesRepository coursesRepository;

        @Mock
        private InterestRepository interestRepository;

        @Mock
        private EnrollmentRepository enrollmentRepository;

        @Spy // Usamos @Spy para que se ejecute la lógica real del normalizador semántico
        private SemanticNormalizer semanticNormalizer;

        @InjectMocks
        private RecommendationService recommendationService;

        private Interest luisInterests;
        private List<Courses> courseCatalog;

        @BeforeEach
        void setUp() {
                // Configurar los intereses en español del alumno Luis (Escenario Real)
                luisInterests = new Interest();
                luisInterests.setId(1L);
                luisInterests.setCategory(new ArrayList<>(List.of("Ciencias Sociales")));
                luisInterests.setCourse_type(new ArrayList<>(List.of("Principiante")));
                luisInterests.setLanguage(new ArrayList<>(List.of("Español")));
                luisInterests.setSubtitle_languages(new ArrayList<>(List.of("Español")));
                luisInterests.setDuration(new ArrayList<>(List.of("Corto")));

                // Configurar el catálogo de cursos simulado (Híbrido/Inglés)
                courseCatalog = new ArrayList<>();

                // Curso A: Coincide semánticamente en categoría ("Social Sciences" = "Ciencias
                // Sociales")
                Courses socialScienceCourse = new Courses();
                socialScienceCourse.setCourse_id(101L);
                socialScienceCourse.setTitle("Introduction to Social Sciences");
                socialScienceCourse.setCategory("Social Sciences"); // <── Variante en Inglés
                socialScienceCourse.setCourseType("Beginner");
                socialScienceCourse.setLanguage("English");
                socialScienceCourse.setSubtitleLanguages("English, Spanish");
                socialScienceCourse.setDuration(8.5f); // <── Corto (<10h)
                socialScienceCourse.setRating(4.8f);

                // Curso B: Categoría diferente ("Business")
                Courses businessCourse = new Courses();
                businessCourse.setCourse_id(102L);
                businessCourse.setTitle("Key Technologies for Business Specialization");
                businessCourse.setCategory("Business");
                businessCourse.setCourseType("Beginner");
                businessCourse.setLanguage("English");
                businessCourse.setSubtitleLanguages("English");
                businessCourse.setDuration(12.0f); // <── Medio (10h-40h)
                businessCourse.setRating(4.5f);

                courseCatalog.add(socialScienceCourse);
                courseCatalog.add(businessCourse);
        }

        @Test
        @DisplayName("Debería recomendar curso de Ciencias Sociales resolviendo la brecha multilingüe con tokens")
        void shouldRecommendSocialSciencesCourseResolvingMultilingualGap() {
                // Arrange (Configuración de comportamientos de los Mocks)
                Long userId = 1L;
                when(interestRepository.findById(userId)).thenReturn(Optional.of(luisInterests));
                when(enrollmentRepository.findAllByUserIdWithCourses(userId)).thenReturn(new ArrayList<>()); // Sin
                                                                                                             // matrículas
                                                                                                             // previas
                when(coursesRepository.findAll()).thenReturn(courseCatalog);

                // Act (Ejecución del método del servicio bajo test)
                List<RecommendationDTO> results = recommendationService.getRecommendationsForUser(userId);

                // Assert (Verificaciones estrictas del comportamiento esperado)
                assertNotNull(results, "La lista de recomendaciones no debe ser nula");
                assertFalse(results.isEmpty(), "La lista de recomendaciones debe contener elementos");
                assertTrue(results.size() <= 6, "No debe superar el límite fijado de 6 elementos");

                // El primer curso sugerido debe ser el de Ciencias Sociales gracias a los 30
                // puntos adicionales de la categoría
                RecommendationDTO topRecommendation = results.get(0);
                assertEquals(101L, topRecommendation.id(),
                                "El curso con mayor afinidad debe ser el de Ciencias Sociales");
                assertEquals("Social Sciences", topRecommendation.category(),
                                "La categoría devuelta debe coincidir con la de la entidad");

                // Verificar que la cadena explicativa generada no esté vacía ni sea el fallback
                // de seguridad genérico
                assertNotNull(topRecommendation.reason());
                assertTrue(topRecommendation.reason().contains("Coincide con tus categorías preferidas"),
                                "El texto de explicabilidad debe reflejar el match exitoso de la categoría");
                assertTrue(topRecommendation.reason().contains("Se ajusta a tu disponibilidad de tiempo"),
                                "El texto debe reflejar que también se calculó la coincidencia de duración");

                // El curso de Ciencias Sociales debe tener mayor puntuación que el de Negocios
                if (results.size() > 1) {
                        RecommendationDTO secondRecommendation = results.get(1);
                        assertTrue(topRecommendation.score() > secondRecommendation.score(),
                                        "El curso de la categoría de interés debe puntuar más alto que el catálogo general");
                }

                // Verificar interacciones seguras con la persistencia
                verify(interestRepository, times(1)).findById(userId);
                verify(coursesRepository, times(1)).findAll();
                verify(enrollmentRepository, times(1)).findAllByUserIdWithCourses(userId);
        }
}
