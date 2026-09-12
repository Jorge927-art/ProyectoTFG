package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Interest;
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
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test-ci")
@Transactional
@DisplayName("Suite de persistencia para preferencias de estudiantes")
class InterestRepositoryTest {

    @Autowired
    private InterestRepository interestRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("findByUser_Username debe recuperar las preferencias mediante el join con usuario")
    void findByUserUsername_ShouldReturnPreferencesForExactUser() {
        Users student = saveUser("alumno_intereses");
        Interest interest = saveInterest(student, List.of("Programación"));

        Interest result = interestRepository.findByUser_Username(student.getUsername()).orElseThrow();

        assertEquals(interest.getId(), result.getId());
        assertEquals(student.getUser_id(), result.getUser().getUser_id());
        assertEquals(List.of("Programación"), result.getCategory());
    }

    @Test
    @DisplayName("findByUser_Username debe devolver vacío para un usuario sin preferencias")
    void findByUserUsername_ShouldReturnEmptyForUserWithoutPreferences() {
        saveUser("alumno_sin_intereses");

        assertTrue(interestRepository.findByUser_Username("alumno_sin_intereses").isEmpty());
    }

    @Test
    @DisplayName("findByUser_Username no debe devolver preferencias de otro usuario")
    void findByUserUsername_ShouldNotCrossUsers() {
        Users firstStudent = saveUser("alumno_primero");
        Users secondStudent = saveUser("alumno_segundo");
        saveInterest(firstStudent, List.of("Diseño"));
        saveInterest(secondStudent, List.of("Marketing"));

        Interest result = interestRepository.findByUser_Username("alumno_segundo").orElseThrow();

        assertEquals(List.of("Marketing"), result.getCategory());
        assertEquals(secondStudent.getUser_id(), result.getUser().getUser_id());
    }

    private Users saveUser(String username) {
        Users user = new Users();
        user.setUsername(username);
        user.setPassword("secret-pass");
        user.setRole(Role.STUDENT);
        user.setEmail(username + "@uni.es");
        user.setEnabled(true);
        return userRepository.saveAndFlush(user);
    }

    private Interest saveInterest(Users user, List<String> categories) {
        Interest interest = new Interest();
        interest.setUser(user);
        interest.setCategory(categories);
        return interestRepository.saveAndFlush(interest);
    }
}
