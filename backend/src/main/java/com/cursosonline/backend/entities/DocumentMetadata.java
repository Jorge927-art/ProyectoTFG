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
    private String filename; // Nombre físico único generado con UUID en disco

    @Column(nullable = false)
    private String originalname; // Nombre original subido por el usuario

    @Column(nullable = false)
    private LocalDateTime upload_date = LocalDateTime.now();

    // --- NUEVOS CAMPOS PARA INTERCAMBIO BIDIRECCIONAL ---

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false) // Quién envía el archivo
    private Users sender;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id", nullable = false) // Quién recibe el archivo
    private Users receiver;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id") // Contexto opcional de la asignatura
    private Courses course;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FolderType folder_type; // SENT o RECEIVED para mapear las pestañas frontend

}
