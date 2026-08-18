package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.DocumentMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

/**
 * Repositorio para la entidad DocumentMetadata, proporcionando métodos de
 * CRUD y consultas personalizadas relacionadas con los documentos.
 */
public interface DocumentMetadataRepository extends JpaRepository<DocumentMetadata, Long> {

        /**
         * Recupera los documentos RECIBIDOS por el usuario (alumno), filtrando
         * estrictamente por FolderType.RECEIVED.
         * 
         * @param username El nombre de usuario del receptor.
         * @return Lista de documentos recibidos por el usuario.
         */
        @Query("SELECT d FROM DocumentMetadata d WHERE d.receiver.username = :username AND d.folder_type = com.cursosonline.backend.entities.FolderType.RECEIVED ORDER BY d.documentid DESC")
        List<DocumentMetadata> findReceivedDocumentsByUsername(@Param("username") String username);

        /**
         * Recupera únicamente documentos RECIBIDOS de mensajería general (sin
         * asignatura asociada), excluyendo entregas o envíos académicos de curso.
         *
         * @param username El nombre de usuario del receptor.
         * @return Lista de documentos recibidos sin curso asociado.
         */
        @Query("SELECT d FROM DocumentMetadata d WHERE d.receiver.username = :username AND d.folder_type = com.cursosonline.backend.entities.FolderType.RECEIVED AND d.course IS NULL AND d.hiddenForReceiver = false ORDER BY d.documentid DESC")
        List<DocumentMetadata> findReceivedGeneralDocumentsByUsername(@Param("username") String username);

        /**
         * Recupera los documentos RECIBIDOS por el usuario (alumno) específicos de una
         * asignatura, filtrando estrictamente por FolderType.RECEIVED.
         * 
         * @param username El nombre de usuario del receptor.
         * @param courseId El ID del curso.
         * @return Lista de documentos recibidos asociados al curso y al usuario.
         */
        @Query("SELECT d FROM DocumentMetadata d WHERE d.receiver.username = :username AND d.course.course_id = :courseId AND d.folder_type = com.cursosonline.backend.entities.FolderType.RECEIVED ORDER BY d.documentid DESC")
        List<DocumentMetadata> findReceivedDocumentsByUsernameAndCourse(@Param("username") String username,
                        @Param("courseId") Long courseId);

        /**
         * Recupera los documentos ENVIADOS por el usuario (alumno), filtrando
         * estrictamente por FolderType.SENT.
         * 
         * @param username El nombre de usuario del emisor.
         * @return Lista de documentos enviados por el usuario.
         */
        @Query("SELECT d FROM DocumentMetadata d WHERE d.sender.username = :username AND d.folder_type = com.cursosonline.backend.entities.FolderType.SENT ORDER BY d.documentid DESC")
        List<DocumentMetadata> findSentDocumentsByUsername(@Param("username") String username);

        /**
         * Recupera únicamente documentos ENVIADOS de mensajería general (sin
         * asignatura asociada), excluyendo entregas o envíos académicos de curso.
         *
         * @param username El nombre de usuario del emisor.
         * @return Lista de documentos enviados sin curso asociado.
         */
        @Query("SELECT d FROM DocumentMetadata d WHERE d.sender.username = :username AND d.folder_type = com.cursosonline.backend.entities.FolderType.SENT AND d.course IS NULL AND d.hiddenForSender = false ORDER BY d.documentid DESC")
        List<DocumentMetadata> findSentGeneralDocumentsByUsername(@Param("username") String username);

        /**
         * Recupera los documentos ENVIADOS por el usuario (alumno) específicos de una
         * asignatura, filtrando estrictamente por FolderType.SENT.
         * 
         * @param username El nombre de usuario del emisor.
         * @param courseId El ID del curso.
         * @return Lista de documentos enviados asociados al curso y al usuario.
         */
        @Query("SELECT d FROM DocumentMetadata d WHERE d.sender.username = :username AND d.course.course_id = :courseId AND d.folder_type = com.cursosonline.backend.entities.FolderType.SENT ORDER BY d.documentid DESC")
        List<DocumentMetadata> findSentDocumentsByUsernameAndCourse(@Param("username") String username,
                        @Param("courseId") Long courseId);

        /**
         * Recupera las entregas RECIBIDAS por un profesor para una matrícula concreta.
         * Se exige contrato estricto de curso: solo documentos vinculados al mismo
         * curso de la matrícula y al profesor receptor autenticado.
         * 
         * @param enrollmentId       El ID de la matrícula.
         * @param instructorUsername El username del profesor autenticado.
         * @return Lista de entregas asociadas a la matrícula y al profesor receptor.
         */
        @Query("SELECT d FROM DocumentMetadata d JOIN Enrollment e ON e.user = d.sender " +
                        "WHERE e.enrollmentid = :enrollmentId " +
                        "AND d.receiver.username = :instructorUsername " +
                        "AND d.folder_type = com.cursosonline.backend.entities.FolderType.RECEIVED " +
                        "AND e.course = d.course " +
                        "ORDER BY d.documentid DESC")
        List<DocumentMetadata> findReceivedDocumentsByEnrollmentIdForInstructor(
                        @Param("enrollmentId") Long enrollmentId,
                        @Param("instructorUsername") String instructorUsername);

        /**
         * Recupera los documentos enviados por el profesor al alumno de una
         * matrícula concreta.
         */
        @Query("SELECT d FROM DocumentMetadata d JOIN Enrollment e ON e.user = d.receiver " +
                        "WHERE e.enrollmentid = :enrollmentId " +
                        "AND d.sender.username = :instructorUsername " +
                        "AND d.folder_type = com.cursosonline.backend.entities.FolderType.SENT " +
                        "AND e.course = d.course " +
                        "ORDER BY d.documentid DESC")
        List<DocumentMetadata> findSentDocumentsByEnrollmentIdForInstructor(
                        @Param("enrollmentId") Long enrollmentId,
                        @Param("instructorUsername") String instructorUsername);

        /**
         * Recupera los documentos RECIBIDOS no leídos por el usuario (alumno),
         * filtrando estrictamente por FolderType.RECEIVED.
         * 
         * @param username El nombre de usuario del receptor.
         * @return Lista de documentos no leídos recibidos por el usuario.
         */
        @Query("SELECT d FROM DocumentMetadata d WHERE d.receiver.username = :username " +
                        "AND d.folder_type = com.cursosonline.backend.entities.FolderType.RECEIVED AND d.read = false AND d.hiddenForReceiver = false "
                        +
                        "ORDER BY d.documentid DESC")
        List<DocumentMetadata> findUnreadReceivedDocumentsByUsername(@Param("username") String username);

        /**
         * Marca todos los documentos RECIBIDOS como leídos para un usuario específico,
         * filtrando estrictamente por FolderType.RECEIVED.
         * 
         * @param username El nombre de usuario del receptor.
         * @return El número de documentos marcados como leídos.
         */
        @org.springframework.data.jpa.repository.Modifying
        @Query("UPDATE DocumentMetadata d SET d.read = true WHERE d.receiver.username = :username " +
                        "AND d.folder_type = com.cursosonline.backend.entities.FolderType.RECEIVED AND d.read = false AND d.hiddenForReceiver = false")
        int markAllReceivedAsRead(@Param("username") String username);

        /**
         * Oculta de forma lógica todos los documentos generales recibidos para el
         * usuario autenticado, sin borrar físicamente los registros.
         */
        @org.springframework.data.jpa.repository.Modifying
        @Query("UPDATE DocumentMetadata d SET d.hiddenForReceiver = true " +
                        "WHERE d.receiver.username = :username " +
                        "AND d.folder_type = com.cursosonline.backend.entities.FolderType.RECEIVED " +
                        "AND d.course IS NULL " +
                        "AND d.hiddenForReceiver = false")
        int hideAllReceivedGeneralDocumentsByUsername(@Param("username") String username);

        /**
         * Oculta de forma lógica todos los documentos generales enviados por el
         * usuario autenticado, sin borrar físicamente los registros.
         */
        @org.springframework.data.jpa.repository.Modifying
        @Query("UPDATE DocumentMetadata d SET d.hiddenForSender = true " +
                        "WHERE d.sender.username = :username " +
                        "AND d.folder_type = com.cursosonline.backend.entities.FolderType.SENT " +
                        "AND d.course IS NULL " +
                        "AND d.hiddenForSender = false")
        int hideAllSentGeneralDocumentsByUsername(@Param("username") String username);

        /**
         * Elimina todos los documentos asociados a un usuario específico, ya sea como
         * emisor o receptor, para cumplir con la política de privacidad y protección de
         * datos.
         * 
         * @param userId El ID del usuario.
         * @return El número de documentos eliminados.
         */
        @org.springframework.data.jpa.repository.Modifying
        @Query("DELETE FROM DocumentMetadata d WHERE d.sender.user_id = :userId OR d.receiver.user_id = :userId")
        int deleteAllBySenderOrReceiver(@Param("userId") Long userId);

}
