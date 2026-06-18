package com.cursosonline.backend.dto;

import lombok.Data;

@Data
public class ProfileUpdateDTO {
    private String email;
    private String phoneNumber;
    private String homeAddress;
}
