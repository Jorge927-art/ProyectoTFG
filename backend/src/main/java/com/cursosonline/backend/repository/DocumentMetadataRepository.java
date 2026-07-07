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
     * Recupera la bandeja de salida del usuario (Documentos Enviados) ordenados por
     * ID descendente.
     */
    @Query("SELECT d FROM DocumentMetadata d WHERE d.sender.username = :username ORDER BY d.documentid DESC")
    List<DocumentMetadata> findSentDocumentsByUsername(@Param("username") String username);
}
