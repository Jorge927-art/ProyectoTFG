package com.cursosonline.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfileResponseDTO {
    private String username;
    private String email;
    private String role;
    private String avatarPath;
    private String phoneNumber;
    private String homeAddress;
}
