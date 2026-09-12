package com.cursosonline.backend.controller;

import com.cursosonline.backend.dto.CourseDispatchConfigDTO;
import com.cursosonline.backend.dto.ProfessorCourseAlertDTO;
import com.cursosonline.backend.dto.UpdateProfessorAlertStatusRequestDTO;
import com.cursosonline.backend.entities.ProfessorAlertStatus;
import com.cursosonline.backend.entities.ProfessorAlertType;
import com.cursosonline.backend.services.ProfessorCourseAlertService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProfessorCourseAlertControllerTest {

    @Mock
    private ProfessorCourseAlertService service;

    @Mock
    private Principal principal;

    @InjectMocks
    private ProfessorCourseAlertController controller;

    @Test
    void getProfessorAlerts_requiresPrincipalAndReturnsAlerts() {
        assertEquals(401, controller.getProfessorAlerts(null).getStatusCode().value());
        when(principal.getName()).thenReturn("profesor");
        when(service.getProfessorAlerts("profesor")).thenReturn(List.of(alertDto()));

        ResponseEntity<?> response = controller.getProfessorAlerts(principal);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(1, ((List<?>) response.getBody()).size());
    }

    @Test
    void updateStatus_requiresPrincipalAndForwardsRequest() {
        UpdateProfessorAlertStatusRequestDTO request = new UpdateProfessorAlertStatusRequestDTO(
                ProfessorAlertStatus.VIEWED);
        assertEquals(401, controller.updateStatus(1L, request, null).getStatusCode().value());
        when(principal.getName()).thenReturn("profesor");
        when(service.updateAlertStatus("profesor", 1L, ProfessorAlertStatus.VIEWED)).thenReturn(alertDto());

        ResponseEntity<?> response = controller.updateStatus(1L, request, principal);

        assertEquals(200, response.getStatusCode().value());
        verify(service).updateAlertStatus("profesor", 1L, ProfessorAlertStatus.VIEWED);
        assertEquals(200, controller.updateStatus(1L, null, principal).getStatusCode().value());
        verify(service).updateAlertStatus("profesor", 1L, null);
    }

    @Test
    void dismissBellAlertRequiresPrincipalAndReturnsSuccess() {
        assertEquals(401, controller.dismissBellAlert(1L, null).getStatusCode().value());
        when(principal.getName()).thenReturn("profesor");

        ResponseEntity<?> response = controller.dismissBellAlert(1L, principal);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(true, ((Map<?, ?>) response.getBody()).get("success"));
        verify(service).dismissBellAlert("profesor", 1L);
    }

    @Test
    void getCourseConfigReturnsConfiguredAndUnconfiguredShapes() {
        assertEquals(401, controller.getCourseConfig(30L, null).getStatusCode().value());
        when(service.findConfigByCourse(30L)).thenReturn(Optional.empty());

        ResponseEntity<?> missing = controller.getCourseConfig(30L, principal);
        assertEquals(false, ((Map<?, ?>) missing.getBody()).get("configured"));

        CourseDispatchConfigDTO config = new CourseDispatchConfigDTO(
                30L, 4, new BigDecimal("90.0"),
                List.of(new BigDecimal("22.5"), new BigDecimal("45.0"), new BigDecimal("67.5")));
        when(service.findConfigByCourse(30L)).thenReturn(Optional.of(config));

        ResponseEntity<?> configured = controller.getCourseConfig(30L, principal);
        assertEquals(true, ((Map<?, ?>) configured.getBody()).get("configured"));
        assertSame(config, ((Map<?, ?>) configured.getBody()).get("config"));
    }

    private ProfessorCourseAlertDTO alertDto() {
        return new ProfessorCourseAlertDTO(
                1L,
                ProfessorAlertType.MATERIAL_DISPATCH,
                ProfessorAlertStatus.VIEWED,
                1,
                new BigDecimal("22.5"),
                30L,
                "Curso",
                20L,
                "alumno",
                "Material",
                "Enviar material",
                LocalDateTime.now(),
                false);
    }
}
