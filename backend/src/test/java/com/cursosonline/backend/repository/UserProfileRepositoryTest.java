package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.UserProfile;
import com.cursosonline.backend.entities.Users;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("test-ci")
@Transactional
@DisplayName("Suite de persistencia para perfiles de usuario")
class UserProfileRepositoryTest {

    @Autowired
    private UserProfileRepository userProfileRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("updateProfileFieldsDirectly debe actualizar teléfono y dirección persistidos")
    void updateProfileFieldsDirectly_ShouldUpdatePersistedFields() {
        UserProfile profile = saveProfile("profile_update", "+34000000000", "Dirección antigua");

        userProfileRepository.updateProfileFieldsDirectly(
                profile.getId(), "+34999999999", "Calle nueva 10");

        entityManager.clear();
        UserProfile updated = userProfileRepository.findById(profile.getId()).orElseThrow();
        assertEquals("+34999999999", updated.getPhoneNumber());
        assertEquals("Calle nueva 10", updated.getHomeAddress());
    }

    @Test
    @DisplayName("updateProfileFieldsDirectly no debe modificar perfiles cuando el ID no existe")
    void updateProfileFieldsDirectly_ShouldIgnoreUnknownId() {
        UserProfile profile = saveProfile("profile_unchanged", "+34000000001", "Dirección estable");

        userProfileRepository.updateProfileFieldsDirectly(999999L, "+34999999999", "No debe guardarse");

        UserProfile unchanged = userProfileRepository.findById(profile.getId()).orElseThrow();
        assertEquals("+34000000001", unchanged.getPhoneNumber());
        assertEquals("Dirección estable", unchanged.getHomeAddress());
    }

    private UserProfile saveProfile(String username, String phone, String address) {
        Users user = new Users();
        user.setUsername(username);
        user.setPassword("secret-pass");
        user.setRole(Role.STUDENT);
        user.setEmail(username + "@uni.es");
        user.setEnabled(true);
        user = userRepository.saveAndFlush(user);

        UserProfile profile = new UserProfile();
        profile.setUser(user);
        profile.setPhoneNumber(phone);
        profile.setHomeAddress(address);
        return userProfileRepository.saveAndFlush(profile);
    }
}
