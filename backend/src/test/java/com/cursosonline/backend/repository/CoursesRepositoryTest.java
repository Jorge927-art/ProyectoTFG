package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Courses;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("test-ci")
@Transactional
@DisplayName("Suite de Persistencia para búsqueda predictiva de cursos")
class CoursesRepositoryTest {

    @Autowired
    private CoursesRepository coursesRepository;

    private void saveCourse(String title, String category) {
        Courses course = new Courses();
        course.setTitle(title);
        course.setCategory(category);
        course.setSite("COLE");
        course.setEverUsed(false);
        coursesRepository.save(course);
    }

    private List<String> extractTitles(List<Courses> courses) {
        return courses.stream().map(course -> Objects.requireNonNull(course.getTitle())).toList();
    }

    @Test
    @DisplayName("searchCoursesPredictive debe ordenar por relevancia y después por título")
    void searchCoursesPredictive_ShouldOrderByRelevanceThenTitle() {
        saveCourse("Data Engineering Fundamentals", "Ingenieria");
        saveCourse("Database Modeling Basics", "Ingenieria");
        saveCourse("Big Data Foundations", "Ingenieria");
        saveCourse("Calculo Avanzado", "Data Science");
        saveCourse("Quimica General", "Ciencias");

        String formattedKeyword = "%data%";
        String startKeyword = "data%";

        Page<Courses> resultPage = coursesRepository.searchCoursesPredictive(
                formattedKeyword,
                startKeyword,
                PageRequest.of(0, 10));

        assertEquals(4, resultPage.getTotalElements());
        assertEquals(
                List.of(
                        "Data Engineering Fundamentals",
                        "Database Modeling Basics",
                        "Big Data Foundations",
                        "Calculo Avanzado"),
                extractTitles(resultPage.getContent()));
    }

    @Test
    @DisplayName("searchCoursesPredictive debe respetar la paginación sin romper el orden de relevancia")
    void searchCoursesPredictive_ShouldRespectPagination() {
        saveCourse("Data Engineering Fundamentals", "Ingenieria");
        saveCourse("Database Modeling Basics", "Ingenieria");
        saveCourse("Big Data Foundations", "Ingenieria");
        saveCourse("Calculo Avanzado", "Data Science");

        String formattedKeyword = "%data%";
        String startKeyword = "data%";

        Page<Courses> firstPage = coursesRepository.searchCoursesPredictive(
                formattedKeyword,
                startKeyword,
                PageRequest.of(0, 2));

        Page<Courses> secondPage = coursesRepository.searchCoursesPredictive(
                formattedKeyword,
                startKeyword,
                PageRequest.of(1, 2));

        assertEquals(List.of("Data Engineering Fundamentals", "Database Modeling Basics"),
                extractTitles(firstPage.getContent()));
        assertEquals(List.of("Big Data Foundations", "Calculo Avanzado"),
                extractTitles(secondPage.getContent()));
    }

    @ParameterizedTest
    @ValueSource(strings = { "data", "DATA", "DaTa" })
    @DisplayName("searchCoursesPredictive debe comportarse igual sin importar el casing del término")
    void searchCoursesPredictive_ShouldBeCaseInsensitive(String keyword) {
        saveCourse("Data Engineering Fundamentals", "Ingenieria");
        saveCourse("Calculo Avanzado", "Data Science");

        String formattedKeyword = "%" + keyword + "%";
        String startKeyword = keyword + "%";

        Page<Courses> resultPage = coursesRepository.searchCoursesPredictive(
                formattedKeyword,
                startKeyword,
                PageRequest.of(0, 10));

        assertEquals(2, resultPage.getTotalElements());
    }
}
