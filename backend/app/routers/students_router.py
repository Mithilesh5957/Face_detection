"""Student management routes — CRUD + face capture."""

import base64

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, Student, RoleEnum
from app.schemas import StudentCreate, StudentOut, FaceCaptureRequest
from app.auth import hash_password, require_admin, get_current_user

router = APIRouter()


def _student_to_out(s: Student) -> StudentOut:
    return StudentOut(
        id=s.id,
        user_id=s.user_id,
        college_roll_number=s.college_roll_number,
        full_name=s.full_name,
        branch=s.branch,
        semester=s.semester,
        has_face=s.face_embedding is not None,
    )


@router.get("/me", response_model=StudentOut)
async def get_my_student_profile(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    """Return the student record for the currently logged-in user."""
    result = await db.execute(select(Student).where(Student.user_id == user.id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return _student_to_out(student)


@router.get("/", response_model=list[StudentOut])
async def list_students(db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    result = await db.execute(select(Student))
    students = result.scalars().all()
    return [_student_to_out(s) for s in students]


@router.post("/", response_model=StudentOut, status_code=201)
async def create_student(req: StudentCreate, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    # Check duplicate roll number
    existing = await db.execute(select(Student).where(Student.college_roll_number == req.college_roll_number))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Roll number already exists")

    # Check duplicate email
    existing_email = await db.execute(select(User).where(User.email == req.email))
    if existing_email.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user account for the student
    user = User(
        name=req.name,
        email=req.email,
        role=RoleEnum.student,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    await db.flush()

    student = Student(
        user_id=user.id,
        college_roll_number=req.college_roll_number,
        full_name=req.full_name,
        branch=req.branch,
        semester=req.semester,
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return _student_to_out(student)


@router.delete("/{student_id}", status_code=204)
async def delete_student(student_id: int, db: AsyncSession = Depends(get_db), admin=Depends(require_admin)):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Also delete the user account
    user_result = await db.execute(select(User).where(User.id == student.user_id))
    user = user_result.scalar_one_or_none()

    await db.delete(student)
    if user:
        await db.delete(user)
    await db.commit()


@router.post("/{student_id}/face", status_code=200)
async def capture_face(
    student_id: int,
    req: FaceCaptureRequest,
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_admin),
):
    """
    Accept base64-encoded face images (ideally 4 angles),
    extract embeddings, average them, and store in the database.
    """
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if not req.images or len(req.images) == 0:
        raise HTTPException(status_code=400, detail="At least one image is required")

    # Lazy import to avoid loading heavy models on module import
    from app.services.face_recognition import face_recognizer

    embeddings = []
    for idx, img_b64 in enumerate(req.images):
        try:
            img_bytes = base64.b64decode(img_b64)
            nparr = np.frombuffer(img_bytes, np.uint8)
            import cv2
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("decode failed")
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid image at index {idx}")

        emb = face_recognizer.extract_embedding(img)
        if emb is None:
            raise HTTPException(
                status_code=400,
                detail=f"No face detected in image {idx}. Please retake.",
            )
        embeddings.append(emb)

    # Average embeddings for a robust representation
    avg_embedding = np.mean(embeddings, axis=0).astype(np.float32)
    # Normalize
    avg_embedding = avg_embedding / np.linalg.norm(avg_embedding)

    student.face_embedding = avg_embedding.tobytes()
    await db.commit()

    return {"message": f"Face registered with {len(embeddings)} image(s)", "student_id": student_id}
