package com.cursosonline.backend.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * Entidad que representa los metadatos de un documento subido al sistema.
 * Contiene información sobre el nombre del archivo, nombre original, fecha de
 * DocumentMetadata
 */
@Entity
@Table(name = "document_metadata")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentMetadata {

    // Identificador único del documento
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long documentid;

    // Nombre físico único generado con UUID en disco
    @Column(nullable = false)
    private String filename;

    // Nombre original del archivo subido por el usuario
    @Column(nullable = false)
    private String originalname;

    // Fecha y hora de subida del documento al sistema
    @Column(nullable = false)
    private LocalDateTime upload_date = LocalDateTime.now();

    // Tipo de evaluación asociada al documento, si aplica
    @Column(name = "evaluation_type")
    private String evaluation_type;

    // Indica si el documento ha sido leído o procesado
    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    // Borrado lógico para ocultar el documento en la bandeja de salida del emisor
    @Column(name = "hidden_for_sender", nullable = false)
    private boolean hiddenForSender = false;

    // Borrado lógico para ocultar el documento en la bandeja de entrada del
    // receptor
    @Column(name = "hidden_for_receiver", nullable = false)
    private boolean hiddenForReceiver = false;

    // Relación con la entidad Users para asociar el documento con un usuario
    // específico
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private Users sender;

    // Relación con la entidad Users para asociar el documento con un usuario
    // específico
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id", nullable = false)
    private Users receiver;

    // Relación con la entidad Courses para asociar el documento con un curso
    // específico, si aplica
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Courses course;

    // Tipo de carpeta donde se encuentra el documento (SENT o RECEIVED)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FolderType folder_type;
}
