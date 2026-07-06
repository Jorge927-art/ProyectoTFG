package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.DocumentMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface DocumentMetadataRepository extends JpaRepository<DocumentMetadata, Long> {

    /**
     * [BLINDAJE DE CONSULTA MULTI-ROL]: Recupera todos los documentos de un usuario
     * ordenados de forma determinista por ID de documento descendente (los más
     * recientes primero).
     */
    @Query("SELECT d FROM DocumentMetadata d WHERE d.user.username = :username ORDER BY d.documentid DESC")
    List<DocumentMetadata> findAllByUserUsernameOrderByDocumentidDesc(@Param("username") String username);
}
