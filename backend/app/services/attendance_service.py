"""Attendance processing pipeline — orchestrates detection, tracking, recognition, and DB updates."""

import time
from datetime import datetime
from typing import List, Tuple, Dict, Optional

import cv2
import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Student, AttendanceLog, AttendanceStatusEnum
from app.config import settings
from app.services.face_detection import face_detector
from app.services.face_recognition import face_recognizer
from app.services.tracker import SimpleTracker


class AttendanceProcessor:
    """
    Processes video frames for attendance:
      1. Detect faces (YOLO / MediaPipe)
      2. Track faces across frames (IoU tracker)
      3. Recognise un-processed tracks (ArcFace)
      4. Mark attendance in DB (once per session per student)
    """

    def __init__(self):
        self.tracker = SimpleTracker(max_age=settings.TRACKER_MAX_AGE)
        self._db_embeddings: Optional[List[Tuple[int, np.ndarray]]] = None
        self._db_names: Dict[int, str] = {}
        self._marked_students: set = set()  # student IDs already marked present this session
        self._last_db_load: float = 0.0
        self._current_session_id: Optional[int] = None

    async def _load_embeddings(self, db: AsyncSession):
        """Load all student embeddings from the database (cached for 30 s)."""
        now = time.time()
        if self._db_embeddings is not None and (now - self._last_db_load) < 30:
            return

        result = await db.execute(select(Student).where(Student.face_embedding.isnot(None)))
        students = result.scalars().all()

        self._db_embeddings = []
        self._db_names = {}
        for s in students:
            emb = np.frombuffer(s.face_embedding, dtype=np.float32)
            self._db_embeddings.append((s.id, emb))
            self._db_names[s.id] = s.full_name

        self._last_db_load = now

    async def process_frame(
        self,
        frame: np.ndarray,
        session_id: int,
        db: AsyncSession,
    ) -> Tuple[np.ndarray, List[dict]]:
        """
        Process a single video frame.

        Returns:
            (annotated_frame, detections_list)
        """
        # Reset tracker if session changed
        if session_id != self._current_session_id:
            self.tracker.reset()
            self._marked_students.clear()
            self._db_embeddings = None
            self._current_session_id = session_id

        await self._load_embeddings(db)

        # Step 1: Detect faces
        detections = face_detector.detect(frame)

        # Step 2: Update tracker
        tracks = self.tracker.update(detections)

        # Step 3: For each un-processed track, run recognition
        annotated = frame.copy()
        detection_events = []

        for track in tracks:
            x1, y1, x2, y2 = track.bbox
            label = "Unknown"
            color = (0, 0, 255)  # Red for unknown

            if track.student_id is not None:
                # Already recognised
                label = self._db_names.get(track.student_id, f"ID:{track.student_id}")
                color = (0, 255, 0)  # Green for known
            elif not track.processed and self._db_embeddings:
                # Need to recognise
                face_crop = frame[max(0, y1):y2, max(0, x1):x2]
                if face_crop.size > 0:
                    emb = face_recognizer.extract_embedding_from_crop(face_crop)
                    if emb is not None:
                        match = face_recognizer.match(
                            emb,
                            self._db_embeddings,
                            threshold=settings.FACE_SIMILARITY_THRESHOLD,
                        )
                        if match:
                            student_id, score = match
                            track.student_id = student_id
                            track.processed = True
                            label = self._db_names.get(student_id, f"ID:{student_id}")
                            color = (0, 255, 0)

                            # Mark attendance (once per session per student)
                            if student_id not in self._marked_students:
                                await self._mark_present(db, session_id, student_id)
                                self._marked_students.add(student_id)
                                detection_events.append({
                                    "student_id": student_id,
                                    "name": label,
                                    "score": round(score, 3),
                                    "event": "marked_present",
                                })
                        else:
                            track.processed = True  # don't retry every frame

            # Draw bounding box and label
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            label_text = f"{label}"
            (tw, th), _ = cv2.getTextSize(
                label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2
            )
            cv2.rectangle(annotated, (x1, y1 - th - 10), (x1 + tw, y1), color, -1)
            cv2.putText(
                annotated, label_text, (x1, y1 - 5),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2,
            )

        return annotated, detection_events

    async def _mark_present(self, db: AsyncSession, session_id: int, student_id: int):
        """Update the attendance log to 'present' for this student in this session."""
        result = await db.execute(
            select(AttendanceLog).where(
                AttendanceLog.session_id == session_id,
                AttendanceLog.student_id == student_id,
            )
        )
        log = result.scalar_one_or_none()
        if log:
            log.status = AttendanceStatusEnum.present
            log.timestamp = datetime.utcnow()
            await db.commit()
