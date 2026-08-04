package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.Users;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("test-ci")
@Transactional
@DisplayName("Suite de Persistencia para titularidad de cursos por profesor")
class CoursesRepositoryAssignedProfessorIntegrationTest {

    @Autowired
    private CoursesRepository coursesRepository;

    @Autowired
    private UserRepository userRepository;

    private Users saveProfessor(String username) {
        Users user = new Users();
        user.setUsername(username);
        user.setPassword("secret-pass");
        user.setRole(Role.PROFESSOR);
        user.setEmail(username + "@uni.es");
        user.setEnabled(true);
        return userRepository.saveAndFlush(user);
    }

    private Courses saveCourse(String title, Users assignedProfessor) {
        Courses course = new Courses();
        course.setTitle(title);
        course.setCategory("Ingenieria");
        course.setAssignedUser(assignedProfessor);
        course.setInstructors(assignedProfessor != null ? assignedProfessor.getUsername() : null);
        return coursesRepository.saveAndFlush(course);
    }

    @Test
    @DisplayName("findAllByAssignedUser_UserIdOrderByTitleAsc debe filtrar por profesor y ordenar por titulo")
    void findAllByAssignedUserUserIdOrderByTitleAsc_ShouldFilterAndSort() {
        Users professorAlpha = saveProfessor("alfa_docente");
        Users professorBeta = saveProfessor("beta_docente");

        saveCourse("Zeta Avanzada", professorAlpha);
        saveCourse("Algebra Lineal", professorAlpha);
        saveCourse("Bases de Datos", professorBeta);

        List<Courses> result = coursesRepository
                .findAllByAssignedUser_UserIdOrderByTitleAsc(professorAlpha.getUser_id());

        assertEquals(2, result.size());
        assertEquals("Algebra Lineal", result.get(0).getTitle());
        assertEquals("Zeta Avanzada", result.get(1).getTitle());
    }
}
