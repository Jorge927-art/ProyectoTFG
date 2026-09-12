package com.cursosonline.backend.dto;

import com.cursosonline.backend.entities.ProfessorAlertStatus;

public record UpdateProfessorAlertStatusRequestDTO(
        ProfessorAlertStatus status) {
}
