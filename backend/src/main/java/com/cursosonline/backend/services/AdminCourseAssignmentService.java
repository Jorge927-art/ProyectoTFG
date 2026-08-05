package com.cursosonline.backend.services;

import com.cursosonline.backend.dto.AdminCourseProfessorReassignmentResultDTO;
import com.cursosonline.backend.dto.AdminProfessorCourseDTO;
import com.cursosonline.backend.dto.AdminProfessorOptionDTO;
import com.cursosonline.backend.entities.Courses;
import com.cursosonline.backend.entities.Role;
import com.cursosonline.backend.entities.UserSystemNotification;
import com.cursosonline.backend.entities.Users;
import com.cursosonline.backend.exception.ResourceNotFoundException;
import com.cursosonline.backend.exception.ServicesException;
import com.cursosonline.backend.repository.CoursesRepository;
import com.cursosonline.backend.repository.UserRepository;
import com.cursosonline.backend.repository.UserSystemNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AdminCourseAssignmentService {

    private static final String COURSE_ASSIGNMENT_CHANGE_TYPE = "COURSE_ASSIGNMENT_CHANGE";
    private static final String COURSE_ASSIGNMENT_CHANGE_TITLE = "Cambio de titularidad de asignatura";

    private final UserRepository userRepository;
    private final CoursesRepository coursesRepository;
    private final UserSystemNotificationRepository userSystemNotificationRepository;
    private final AdminCourseCatalogService adminCourseCatalogService;

    @Transactional(readOnly = true)
    public List<AdminProfessorOptionDTO> getEnabledProfessorsAlphabetical() {
        return userRepository.findByRole(Role.PROFESSOR)
                .stream()
                .filter(user -> user != null && Boolean.TRUE.equals(user.getEnabled()))
                .sorted(Comparator.comparing(
                        user -> user.getUsername() != null ? user.getUsername() : "",
                        String.CASE_INSENSITIVE_ORDER))
                .map(user -> new AdminProfessorOptionDTO(user.getUser_id(), user.getUsername()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminProfessorCourseDTO> getCoursesAssignedToProfessor(Long professorId) {
        Users professor = userRepository.findById(professorId)
                .orElseThrow(() -> new ResourceNotFoundException("Profesor no encontrado con id: " + professorId));

        if (professor.getRole() != Role.PROFESSOR) {
            throw new ServicesException("Acción inválida: el usuario seleccionado no tiene rol PROFESSOR.");
        }

        return coursesRepository.findAllByAssignedUser_UserIdOrderByTitleAsc(professorId)
                .stream()
                .map(course -> new AdminProfessorCourseDTO(
                        course.getCourse_id(),
                        course.getTitle(),
                        professor.getUser_id(),
                        professor.getUsername()))
                .toList();
    }

    @Transactional
    public AdminCourseProfessorReassignmentResultDTO reassignCourseProfessor(Long courseId, Long newProfessorId) {
        if (newProfessorId == null) {
            throw new ServicesException("Debes seleccionar un profesor entrante válido.");
        }

        Courses course = coursesRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Curso no encontrado con id: " + courseId));

        Users currentProfessor = course.getAssignedUser();

        Users newProfessor = userRepository.findById(newProfessorId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Profesor entrante no encontrado con id: " + newProfessorId));

        if (newProfessor.getRole() != Role.PROFESSOR) {
            throw new ServicesException("Acción inválida: solo se puede reasignar a usuarios con rol PROFESSOR.");
        }

        if (!newProfessor.isEnabled()) {
            throw new ServicesException("Acción inválida: no se puede asignar un profesor deshabilitado.");
        }

        if (currentProfessor != null
                && currentProfessor.getUser_id() != null
                && currentProfessor.getUser_id().equals(newProfessor.getUser_id())) {
            throw new ServicesException("El profesor seleccionado ya es titular de esta asignatura.");
        }

        String previousUsername = currentProfessor != null ? currentProfessor.getUsername() : null;
        String nextUsername = newProfessor.getUsername();

        course.setAssignedUser(newProfessor);
        course.setInstructors(nextUsername);
        Courses savedCourse = coursesRepository.saveAndFlush(course);
        adminCourseCatalogService.markCourseAsEverUsed(savedCourse.getCourse_id());

        if (currentProfessor != null) {
            userSystemNotificationRepository.save(buildOutNotification(currentProfessor, savedCourse));
        }
        userSystemNotificationRepository.save(buildInNotification(newProfessor, savedCourse));

        return new AdminCourseProfessorReassignmentResultDTO(
                "Reasignación completada. El curso ahora pertenece al nuevo profesor indicado por administración.",
                savedCourse.getCourse_id(),
                savedCourse.getTitle(),
                currentProfessor != null ? currentProfessor.getUser_id() : null,
                previousUsername,
                newProfessor.getUser_id(),
                nextUsername);
    }

    private UserSystemNotification buildOutNotification(Users previousProfessor, Courses course) {
        String courseTitle = safeCourseTitle(course.getTitle());
        UserSystemNotification notification = new UserSystemNotification();
        notification.setReceiver(previousProfessor);
        notification.setType(COURSE_ASSIGNMENT_CHANGE_TYPE);
        notification.setTitle(COURSE_ASSIGNMENT_CHANGE_TITLE);
        notification.setMessage(
                "Has sido desvinculado como profesor de la asignatura \"" + courseTitle
                        + "\" por una reasignación administrativa. Ya no tienes acceso docente a este curso.");
        notification.setRedirectUrl("/professor");
        notification.setRead(false);
        return notification;
    }

    private UserSystemNotification buildInNotification(Users newProfessor, Courses course) {
        String courseTitle = safeCourseTitle(course.getTitle());
        UserSystemNotification notification = new UserSystemNotification();
        notification.setReceiver(newProfessor);
        notification.setType(COURSE_ASSIGNMENT_CHANGE_TYPE);
        notification.setTitle(COURSE_ASSIGNMENT_CHANGE_TITLE);
        notification.setMessage(
                "Has sido asignado como profesor de la asignatura \"" + courseTitle
                        + "\" mediante una reasignación administrativa.");
        notification.setRedirectUrl("/professor");
        notification.setRead(false);
        return notification;
    }

    private String safeCourseTitle(String title) {
        if (title == null || title.trim().isEmpty()) {
            return "Curso sin título";
        }
        return title.trim().toLowerCase(Locale.ROOT).equals("null") ? "Curso sin título" : title.trim();
    }
}
