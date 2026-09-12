package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.AdminStudentPreferencesDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Enrollment;
import com.cursosonline.backend.entities.Interest;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.EnrollmentRepository;
import com.cursosonline.backend.repository.InterestRepository;
import com.cursosonline.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminStudentPreferencesServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private InterestRepository interestRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private CoursesRepository coursesRepository;

    @InjectMocks
    private AdminStudentPreferencesService service;

    @Test
    void agregaPreferenciasPuntuaMatriculasYDevuelveSeisCursos() {
        Users activeStudent = student(1L, true);
        Users inactiveStudent = student(2L, false);
        Courses topCourse = course(10L, "Java", "Programación", "Intermedio", "Español", "Inglés", 20F);
        topCourse.setAssignedUser(student(9L, true));
        Courses secondCourse = course(11L, "Diseño", "Diseño", "Básico", "Inglés", null, 50F);

        Interest interest = interest(activeStudent, List.of("Programación"), List.of("Medio"),
                List.of("Medio (1 - 6 semanas)"), List.of("Español"), List.of("Subtítulos en Inglés"));
        Interest inactiveInterest = interest(inactiveStudent, List.of("Diseño"), List.of("Básico"),
                List.of("Corto (< 1 semana)"), List.of("Inglés"), List.of());

        when(userRepository.findByRole(Role.STUDENT)).thenReturn(List.of(activeStudent, inactiveStudent));
        when(interestRepository.findAll()).thenReturn(List.of(interest, inactiveInterest));
        when(enrollmentRepository.findAll()).thenReturn(List.of(
                enrollment(activeStudent, topCourse, "EN_PROGRESO"),
                enrollment(activeStudent, topCourse, "COMPLETADO"),
                enrollment(activeStudent, secondCourse, "CANCELADO"),
                enrollment(inactiveStudent, secondCourse, "EN_PROGRESO")));
        when(coursesRepository.findAll()).thenReturn(List.of(topCourse, secondCourse));

        AdminStudentPreferencesDTO result = service.getAggregatedPreferences();

        assertEquals(1, result.studentsWithPreferences());
        assertEquals(2, result.activeStudentsWithEnrollments());
        assertEquals(List.of("Programación"), result.preferences().get(0).values());
        assertEquals(1, result.courses().size());
        assertEquals(10L, result.courses().get(0).courseId());
        assertEquals(20D, result.courses().get(0).enrollmentScore());
        assertTrue(result.courses().get(0).professorAssigned());
        assertEquals("Java", result.courses().get(0).title());
    }

    @Test
    void usaSoloMatriculasCuandoNoHayPreferenciasYNoDevuelveCursosSinPuntuacion() {
        Users activeStudent = student(1L, true);
        Courses enrolled = course(10L, "Java", "Programación", "Intermedio", "Español", null, 20F);
        Courses empty = course(11L, "Sin demanda", "Diseño", "Básico", "Inglés", null, 20F);

        when(userRepository.findByRole(Role.STUDENT)).thenReturn(List.of(activeStudent));
        when(interestRepository.findAll()).thenReturn(List.of());
        when(enrollmentRepository.findAll()).thenReturn(List.of(enrollment(activeStudent, enrolled, "EN_PROGRESO")));
        when(coursesRepository.findAll()).thenReturn(List.of(enrolled, empty));

        AdminStudentPreferencesDTO result = service.getAggregatedPreferences();

        assertEquals(0, result.studentsWithPreferences());
        assertEquals(1, result.courses().size());
        assertEquals(10L, result.courses().get(0).courseId());
        assertEquals(20D, result.courses().get(0).enrollmentScore());
    }

    @Test
    void noDevuelveNadaCuandoNoHayPreferenciasNiMatriculasValidas() {
        Users inactiveStudent = student(1L, false);
        Courses course = course(10L, "Java", "Programación", "Intermedio", "Español", null, 20F);

        when(userRepository.findByRole(Role.STUDENT)).thenReturn(List.of(inactiveStudent));
        when(interestRepository.findAll()).thenReturn(List.of());
        when(enrollmentRepository.findAll()).thenReturn(List.of());
        when(coursesRepository.findAll()).thenReturn(List.of(course));

        AdminStudentPreferencesDTO result = service.getAggregatedPreferences();

        assertTrue(result.preferences().stream().allMatch(preference -> preference.values().isEmpty()));
        assertTrue(result.courses().isEmpty());
    }

    @Test
    void aplicaNormalizacionYReglasDePuntuacionEnTodasLasDimensiones() {
        Users activeStudent = student(1L, true);
        Courses java = course(10L, "Java", "Programación", "Avanzado", "Inglés", "English", 5F);
        Courses design = course(11L, "Diseño", "Diseño", "Intermedio", "Español", null, 20F);
        Courses longCourse = course(12L, "DevOps", "DevOps", "Básico", "Francés", "Français", 50F);

        Interest preferences = interest(activeStudent,
                List.of("Programación", "Diseño", "DevOps"),
                List.of("Todos los niveles", "Intermedio", "Básico"),
                List.of("Corto (< 1 semana)", "Medio (1 - 6 semanas)", "Largo (> 6 semanas)"),
                List.of("Inglés", "Español", "Francés"),
                List.of("Subtítulos en Inglés", "Sin subtítulos", "Subtítulos en Español"));

        when(userRepository.findByRole(Role.STUDENT)).thenReturn(List.of(activeStudent));
        when(interestRepository.findAll()).thenReturn(List.of(preferences));
        when(enrollmentRepository.findAll()).thenReturn(List.of(
                enrollment(activeStudent, java, "EN_PROGRESO"),
                enrollment(activeStudent, design, "COMPLETADO"),
                enrollment(activeStudent, longCourse, "inactiva"),
                enrollment(activeStudent, longCourse, "CANCELADA")));
        when(coursesRepository.findAll()).thenReturn(List.of(java, design, longCourse));

        AdminStudentPreferencesDTO result = service.getAggregatedPreferences();

        assertEquals(1, result.studentsWithPreferences());
        assertEquals(2, result.activeStudentsWithEnrollments());
        assertEquals(List.of("DevOps", "Diseño", "Programación"), result.preferences().get(0).values());
        assertEquals(List.of("Básico", "Intermedio", "Todos los niveles"), result.preferences().get(1).values());
        assertEquals(3, result.courses().size());
        AdminStudentPreferencesDTO.CourseDemand javaDemand = result.courses().stream()
                .filter(courseDemand -> courseDemand.courseId().equals(10L))
                .findFirst()
                .orElseThrow();
        assertEquals(20D, javaDemand.enrollmentScore());
        assertEquals(30D, javaDemand.categoryScore());
        assertEquals(0D, javaDemand.levelScore());
        assertEquals(15D, javaDemand.languageScore());
        assertEquals(10D, javaDemand.subtitleScore());
        assertEquals(5D, javaDemand.durationScore());
    }

    @Test
    void limitaLasRecomendacionesYDescartaDatosIncompletos() {
        Users activeStudent = student(1L, true);
        Courses enrolled = course(1L, "Curso 1", "Programación", "Básico", "Español", null, 5F);
        Interest preference = interest(activeStudent, List.of("Programación"), List.of("Básico"),
                List.of("Corto"), List.of("Español"), List.of("Sin subtítulos"));
        List<Courses> courses = IntStream.rangeClosed(1, 8)
                .mapToObj(id -> course((long) id, "Curso " + id, "Programación", "Básico", "Español", null, 5F))
                .toList();
        List<Enrollment> enrollments = new ArrayList<>();
        enrollments.add(enrollment(activeStudent, enrolled, "EN_PROGRESO"));

        when(userRepository.findByRole(Role.STUDENT)).thenReturn(List.of(activeStudent));
        when(interestRepository.findAll()).thenReturn(List.of(preference));
        when(enrollmentRepository.findAll()).thenReturn(enrollments);
        when(coursesRepository.findAll()).thenReturn(courses);

        AdminStudentPreferencesDTO result = service.getAggregatedPreferences();

        assertEquals(6, result.courses().size());
        assertEquals(1L, result.courses().get(0).courseId());
        assertTrue(result.preferences().stream().allMatch(summary -> summary.selections() == 1));
    }

    @Test
    void ignoraRegistrosLegacyIncompletosSinInterrumpirElAnalisis() {
        Users activeStudent = student(1L, true);
        Users userWithoutId = student(null, true);
        Courses courseWithoutId = course(null, "Sin id", "Programación", "Básico", "Español", null, 5F);
        Courses incompleteCourse = course(20L, null, null, null, null, null, null);
        Interest emptyInterest = interest(activeStudent, List.of(), List.of(), List.of(), List.of(), List.of());
        Interest unrelatedInterest = interest(userWithoutId, List.of("Programación"), List.of(), List.of(), List.of(),
                List.of());
        List<Enrollment> invalidEnrollments = new ArrayList<>();
        invalidEnrollments.add(null);
        invalidEnrollments.add(enrollment(null, incompleteCourse, "EN_PROGRESO"));
        invalidEnrollments.add(enrollment(activeStudent, null, "EN_PROGRESO"));
        invalidEnrollments.add(enrollment(activeStudent, courseWithoutId, "EN_PROGRESO"));
        invalidEnrollments.add(enrollment(activeStudent, incompleteCourse, "ELIMINADA"));

        List<Users> users = new ArrayList<>();
        users.add(activeStudent);
        users.add(userWithoutId);
        users.add(null);
        when(userRepository.findByRole(Role.STUDENT)).thenReturn(users);
        when(interestRepository.findAll()).thenReturn(List.of(emptyInterest, unrelatedInterest));
        when(enrollmentRepository.findAll()).thenReturn(invalidEnrollments);
        List<Courses> courses = new ArrayList<>();
        courses.add(null);
        courses.add(courseWithoutId);
        courses.add(incompleteCourse);
        when(coursesRepository.findAll()).thenReturn(courses);

        AdminStudentPreferencesDTO result = service.getAggregatedPreferences();

        assertEquals(0, result.studentsWithPreferences());
        assertEquals(0, result.activeStudentsWithEnrollments());
        assertTrue(result.courses().isEmpty());
        assertTrue(result.preferences().stream().allMatch(summary -> summary.values().isEmpty()));
    }

    private Users student(Long id, boolean enabled) {
        return new Users(id, "user_" + id, "password", Role.STUDENT, "user" + id + "@test.com", enabled,
                new ArrayList<>());
    }

    private Courses course(Long id, String title, String category, String type, String language, String subtitles,
            Float duration) {
        Courses course = new Courses();
        course.setCourse_id(id);
        course.setTitle(title);
        course.setCategory(category);
        course.setCourseType(type);
        course.setLanguage(language);
        course.setSubtitleLanguages(subtitles);
        course.setDuration(duration);
        return course;
    }

    private Interest interest(Users user, List<String> categories, List<String> levels, List<String> durations,
            List<String> languages, List<String> subtitles) {
        Interest interest = new Interest();
        interest.setUser(user);
        interest.setCategory(categories);
        interest.setCourse_type(levels);
        interest.setDuration(durations);
        interest.setLanguage(languages);
        interest.setSubtitle_languages(subtitles);
        return interest;
    }

    private Enrollment enrollment(Users user, Courses course, String status) {
        Enrollment enrollment = new Enrollment();
        enrollment.setUser(user);
        enrollment.setCourse(course);
        enrollment.setStatus(status);
        return enrollment;
    }
}
