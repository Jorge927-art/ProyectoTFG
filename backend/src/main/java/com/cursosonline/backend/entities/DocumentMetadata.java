package com.cursosonline.backend.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "document_metadata")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long documentid;

    @Column(nullable = false)
    private String filename; // Nombre físico único generado con UUID en disco (ej: uuid_clase.pdf)

    @Column(nullable = false)
    private String originalname; // Nombre original subido por el usuario (ej: Tema1.pdf)

    @Column(nullable = false)
    private LocalDateTime upload_date = LocalDateTime.now();

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id") // Vinculado a la tabla Users (sirve para Alumnos, Profesores o Admins)
    private Users user;
}
