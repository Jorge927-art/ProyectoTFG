package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.DocumentMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface DocumentMetadataRepository extends JpaRepository<DocumentMetadata, Long> {

    /**
     * Recupera la bandeja de entrada del usuario (Documentos Recibidos) ordenados
     * por ID descendente.
     */
    @Query("SELECT d FROM DocumentMetadata d WHERE d.receiver.username = :username ORDER BY d.documentid DESC")
    List<DocumentMetadata> findReceivedDocumentsByUsername(@Param("username") String username);

    /**
     * Recupera los documentos RECIBIDOS por el usuario (alumno) específicos de una
     * asignatura.
     * Permite al alumno ver lo que el profesor le envía de vuelta.
     */
    @Query("SELECT d FROM DocumentMetadata d WHERE d.receiver.username = :username AND d.course.course_id = :courseId ORDER BY d.documentid DESC")
    List<DocumentMetadata> findReceivedDocumentsByUsernameAndCourse(@Param("username") String username,
            @Param("courseId") Long courseId);

    /**
     * Recupera la bandeja de salida del usuario (Documentos Enviados) ordenados por
     * ID descendente.
     */
    @Query("SELECT d FROM DocumentMetadata d WHERE d.sender.username = :username ORDER BY d.documentid DESC")
    List<DocumentMetadata> findSentDocumentsByUsername(@Param("username") String username);

    /**
     * Recupera los documentos ENVIADOS por el usuario (alumno) específicos de una
     * asignatura.
     * Permite al alumno ver el histórico de sus entregas en este panel.
     */
    @Query("SELECT d FROM DocumentMetadata d WHERE d.sender.username = :username AND d.course.course_id = :courseId ORDER BY d.documentid DESC")
    List<DocumentMetadata> findSentDocumentsByUsernameAndCourse(@Param("username") String username,
            @Param("courseId") Long courseId);

}
