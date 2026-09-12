package com.cursosonline.backend.entities;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class ProfessorAlertEntitiesTest {

    @Test
    void dispatchConfigSetsCreationTimeOnlyWhenMissing() {
        CourseMaterialDispatchConfig config = new CourseMaterialDispatchConfig();
        config.onCreate();
        assertNotNull(config.getCreatedAt());
        LocalDateTime first = config.getCreatedAt();
        config.onCreate();
        assertEquals(first, config.getCreatedAt());
    }

    @Test
    void professorCourseAlertUpdatesAuditDatesOnlyWhenNeeded() {
        ProfessorCourseAlert alert = new ProfessorCourseAlert();
        alert.onCreate();
        assertNotNull(alert.getCreatedAt());
        assertNotNull(alert.getUpdatedAt());
        LocalDateTime created = alert.getCreatedAt();
        LocalDateTime updated = alert.getUpdatedAt();

        alert.onCreate();
        assertEquals(created, alert.getCreatedAt());
        alert.onUpdate();
        assertNotNull(alert.getUpdatedAt());
        assertNotNull(updated);
    }
}
