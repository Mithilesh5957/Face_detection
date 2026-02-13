"""Attendance session management + real-time WebSocket feed."""

import base64
import json
from datetime import datetime

import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db, AsyncSessionLocal
from app.models import (
    AttendanceSession, AttendanceLog, Student,
    SessionStatusEnum, AttendanceStatusEnum,
)
from app.schemas import SessionOut, AttendanceLogOut, OverrideRequest, SessionSummary
from app.auth import require_admin, get_current_user

router = APIRouter()


# ── Session CRUD ────────────────────────────────────────────────────────────────

@router.get("/sessions", response_model=list[SessionOut])
async def list_sessions(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    result = await db.execute(
        select(AttendanceSession).order_by(AttendanceSession.start_time.desc())
    )
    return result.scalars().all()


@router.post("/start", response_model=SessionOut)
async def start_session(db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    # Check if there's already an active session
    result = await db.execute(
        select(AttendanceSession).where(AttendanceSession.status == SessionStatusEnum.active)
    )
    active = result.scalar_one_or_none()
    if active:
        raise HTTPException(status_code=400, detail="An active session already exists")

    session = AttendanceSession(
        start_time=datetime.utcnow(),
        status=SessionStatusEnum.active,
    )
    db.add(session)
    await db.flush()

    # Create ABSENT logs for every student (default absent)
    students_result = await db.execute(select(Student))
    students = students_result.scalars().all()
    for s in students:
        log = AttendanceLog(
            session_id=session.id,
            student_id=s.id,
            status=AttendanceStatusEnum.absent,
        )
        db.add(log)

    await db.commit()
    await db.refresh(session)
    return session


@router.post("/stop", response_model=SessionSummary)
async def stop_session(db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    result = await db.execute(
        select(AttendanceSession).where(AttendanceSession.status == SessionStatusEnum.active)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=400, detail="No active session")

    session.end_time = datetime.utcnow()
    session.status = SessionStatusEnum.completed

    # Fetch logs
    logs_result = await db.execute(
        select(AttendanceLog, Student)
        .join(Student, AttendanceLog.student_id == Student.id)
        .where(AttendanceLog.session_id == session.id)
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

    await db.commit()

    return SessionSummary(
        session_id=session.id,
        total_students=len(log_list),
        present_count=present_count,
        absent_count=len(log_list) - present_count,
        logs=log_list,
    )


@router.get("/session/{session_id}/logs", response_model=list[AttendanceLogOut])
async def get_session_logs(session_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    result = await db.execute(
        select(AttendanceLog, Student)
        .join(Student, AttendanceLog.student_id == Student.id)
        .where(AttendanceLog.session_id == session_id)
    )
    rows = result.all()
    return [
        AttendanceLogOut(
            id=log.id,
            session_id=log.session_id,
            student_id=log.student_id,
            student_name=student.full_name,
            roll_number=student.college_roll_number,
            timestamp=log.timestamp,
            status=log.status.value,
        )
        for log, student in rows
    ]


@router.post("/override")
async def override_attendance(
    req: OverrideRequest,
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_admin),
):
    result = await db.execute(
        select(AttendanceLog).where(
            AttendanceLog.session_id == req.session_id,
            AttendanceLog.student_id == req.student_id,
        )
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Log entry not found")

    log.status = AttendanceStatusEnum(req.status)
    if req.status == "present":
        log.timestamp = datetime.utcnow()
    else:
        log.timestamp = None

    await db.commit()
    return {"message": "Attendance updated"}


# ── Real-time WebSocket for video processing ────────────────────────────────────

@router.websocket("/ws")
async def attendance_websocket(ws: WebSocket):
    """
    Client sends base64 JPEG frames.
    Server processes them through the AI pipeline and returns:
      - Annotated frame (base64 JPEG)
      - List of detected / recognized students
    """
    await ws.accept()

    # Lazy-load heavy models
    from app.services.attendance_service import AttendanceProcessor
    processor = AttendanceProcessor()

    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)
            frame_b64 = msg.get("frame")
            session_id = msg.get("session_id")

            if not frame_b64 or not session_id:
                await ws.send_json({"error": "Missing frame or session_id"})
                continue

            # Decode frame
            try:
                img_bytes = base64.b64decode(frame_b64)
                nparr = np.frombuffer(img_bytes, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            except Exception:
                await ws.send_json({"error": "Invalid frame data"})
                continue

            if frame is None:
                await ws.send_json({"error": "Could not decode frame"})
                continue

            # Process through AI pipeline
            async with AsyncSessionLocal() as db:
                annotated_frame, detections = await processor.process_frame(
                    frame, session_id, db
                )

            # Encode annotated frame
            _, buffer = cv2.imencode(".jpg", annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            annotated_b64 = base64.b64encode(buffer).decode("utf-8")

            await ws.send_json({
                "frame": annotated_b64,
                "detections": detections,
            })

    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await ws.close()
