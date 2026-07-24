package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.DocumentMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface DocumentMetadataRepository extends JpaRepository<DocumentMetadata, Long> {

        /**
         * Recupera la bandeja de entrada del usuario (Documentos Recibidos) ordenados
         * por ID descendente, filtrando estrictamente por FolderType.RECEIVED.
         */
        @Query("SELECT d FROM DocumentMetadata d WHERE d.receiver.username = :username AND d.folder_type = com.cursosonline.backend.entities.FolderType.RECEIVED ORDER BY d.documentid DESC")
        List<DocumentMetadata> findReceivedDocumentsByUsername(@Param("username") String username);

        /**
         * Recupera los documentos RECIBIDOS por el usuario (alumno) específicos de una
         * asignatura, filtrando estrictamente por FolderType.RECEIVED.
         */
        @Query("SELECT d FROM DocumentMetadata d WHERE d.receiver.username = :username AND d.course.course_id = :courseId AND d.folder_type = com.cursosonline.backend.entities.FolderType.RECEIVED ORDER BY d.documentid DESC")
        List<DocumentMetadata> findReceivedDocumentsByUsernameAndCourse(@Param("username") String username,
                        @Param("courseId") Long courseId);

        /**
         * Recupera la bandeja de salida del usuario (Documentos Enviados) ordenados por
         * ID descendente, filtrando estrictamente por FolderType.SENT.
         */
        @Query("SELECT d FROM DocumentMetadata d WHERE d.sender.username = :username AND d.folder_type = com.cursosonline.backend.entities.FolderType.SENT ORDER BY d.documentid DESC")
        List<DocumentMetadata> findSentDocumentsByUsername(@Param("username") String username);

        /**
         * Recupera los documentos ENVIADOS por el usuario (alumno) específicos de una
         * asignatura, filtrando estrictamente por FolderType.SENT.
         */
        @Query("SELECT d FROM DocumentMetadata d WHERE d.sender.username = :username AND d.course.course_id = :courseId AND d.folder_type = com.cursosonline.backend.entities.FolderType.SENT ORDER BY d.documentid DESC")
        List<DocumentMetadata> findSentDocumentsByUsernameAndCourse(@Param("username") String username,
                        @Param("courseId") Long courseId);

        /**
         * Recupera las entregas asociadas a una matrícula concreta: mismo alumno
         * emisor y mismo curso de la matrícula.
         */
        @Query("SELECT d FROM DocumentMetadata d JOIN Enrollment e ON e.user = d.sender AND e.course = d.course " +
                        "WHERE e.enrollmentid = :enrollmentId " +
                        "AND d.folder_type = com.cursosonline.backend.entities.FolderType.RECEIVED " +
                        "ORDER BY d.documentid DESC")
        List<DocumentMetadata> findDocumentsByEnrollmentId(@Param("enrollmentId") Long enrollmentId);

}
