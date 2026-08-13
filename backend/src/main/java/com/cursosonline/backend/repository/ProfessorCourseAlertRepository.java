package com.cursosonline.backend.repository;

import com.cursosonline.backend.entities.ProfessorAlertStatus;
import com.cursosonline.backend.entities.ProfessorAlertType;
import com.cursosonline.backend.entities.ProfessorCourseAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProfessorCourseAlertRepository extends JpaRepository<ProfessorCourseAlert, Long> {

    List<ProfessorCourseAlert> findByProfessor_UsernameOrderByCreatedAtDesc(String username);

    @Query("SELECT a FROM ProfessorCourseAlert a WHERE a.professor.username = :username AND a.bellDismissed = false ORDER BY a.createdAt ASC")
    List<ProfessorCourseAlert> findBellPendingByProfessorUsername(@Param("username") String username);

    long countByProfessor_UsernameAndBellDismissedFalse(String username);

    boolean existsByEnrollment_EnrollmentidAndAlertTypeAndCheckpointIndex(
            Long enrollmentId,
            ProfessorAlertType alertType,
            int checkpointIndex);

    @Query("SELECT a FROM ProfessorCourseAlert a WHERE a.enrollment.enrollmentid = :enrollmentId " +
            "AND a.alertType = :alertType AND a.status IN :statuses ORDER BY a.checkpointIndex ASC")
    List<ProfessorCourseAlert> findByEnrollmentAndTypeAndStatuses(
            @Param("enrollmentId") Long enrollmentId,
            @Param("alertType") ProfessorAlertType alertType,
            @Param("statuses") Collection<ProfessorAlertStatus> statuses);

    Optional<ProfessorCourseAlert> findByAlertIdAndProfessor_Username(Long alertId, String username);

    @Modifying
    @Query("UPDATE ProfessorCourseAlert a SET a.bellDismissed = true WHERE a.alertId = :alertId AND a.professor.username = :username")
    int dismissBellByAlertIdAndProfessorUsername(@Param("alertId") Long alertId, @Param("username") String username);
}
