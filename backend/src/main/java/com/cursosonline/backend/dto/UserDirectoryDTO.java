package com.cursosonline.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDirectoryDTO {
    private Long userId;
    private String username;
    private String email;
    private String role;
}
