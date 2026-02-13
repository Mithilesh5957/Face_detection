"""Reporting routes — session details and per-student history."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import AttendanceLog, AttendanceSession, Student, AttendanceStatusEnum, SessionStatusEnum
from app.schemas import AttendanceLogOut, SessionSummary, StudentAttendanceReport
from app.auth import get_current_user

router = APIRouter()


@router.get("/session/{session_id}", response_model=SessionSummary)
async def session_report(session_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    session_result = await db.execute(
        select(AttendanceSession).where(AttendanceSession.id == session_id)
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    logs_result = await db.execute(
        select(AttendanceLog, Student)
        .join(Student, AttendanceLog.student_id == Student.id)
        .where(AttendanceLog.session_id == session_id)
    )
    rows = logs_result.all()

    log_list = []
    present_count = 0
    for log, student in rows:
        if log.status == AttendanceStatusEnum.present:
            present_count += 1
        log_list.append(AttendanceLogOut(
            id=log.id,
            session_id=log.session_id,
            student_id=log.student_id,
            student_name=student.full_name,
            roll_number=student.college_roll_number,
            timestamp=log.timestamp,
            status=log.status.value,
        ))

    return SessionSummary(
        session_id=session.id,
        total_students=len(log_list),
        present_count=present_count,
        absent_count=len(log_list) - present_count,
        logs=log_list,
    )


@router.get("/student/{student_id}", response_model=list[AttendanceLogOut])
async def student_history(student_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    """Return all attendance logs for a specific student across all sessions."""
    result = await db.execute(
        select(AttendanceLog)
        .where(AttendanceLog.student_id == student_id)
        .order_by(AttendanceLog.id.desc())
    )
    logs = result.scalars().all()
    return [
        AttendanceLogOut(
            id=log.id,
            session_id=log.session_id,
            student_id=log.student_id,
            timestamp=log.timestamp,
            status=log.status.value,
        )
        for log in logs
    ]


@router.get("/summary", response_model=list[StudentAttendanceReport])
async def overall_summary(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    """Get attendance percentage for all students across all completed sessions."""
    students_result = await db.execute(select(Student))
    students = students_result.scalars().all()

    # Count total completed sessions
    total_sessions_result = await db.execute(
        select(func.count(AttendanceSession.id)).where(
            AttendanceSession.status == SessionStatusEnum.completed
        )
    )
    total_sessions = total_sessions_result.scalar() or 0

    reports = []
    for s in students:
        attended_result = await db.execute(
            select(func.count(AttendanceLog.id)).where(
                AttendanceLog.student_id == s.id,
                AttendanceLog.status == AttendanceStatusEnum.present,
            )
        )
        attended = attended_result.scalar() or 0
        percentage = (attended / total_sessions * 100) if total_sessions > 0 else 0.0

        reports.append(StudentAttendanceReport(
            student_id=s.id,
            student_name=s.full_name,
            roll_number=s.college_roll_number,
            total_sessions=total_sessions,
            attended=attended,
            percentage=round(percentage, 1),
        ))

    return reports
