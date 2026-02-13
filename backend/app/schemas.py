"""Pydantic schemas for request / response validation."""

from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, validator


# ── Auth ────────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    name: str


class RegisterUserRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "student"


# ── Students ────────────────────────────────────────────────────────────────────
class StudentCreate(BaseModel):
    name: str
    email: str
    password: str
    college_roll_number: str
    full_name: str
    branch: str
    semester: int


class StudentOut(BaseModel):
    id: int
    user_id: int
    college_roll_number: str
    full_name: str
    branch: str
    semester: int
    has_face: bool  # True if face_embedding is not None

    class Config:
        from_attributes = True
        orm_mode = True


class FaceCaptureRequest(BaseModel):
    """Expects base64-encoded JPEG images from 4 angles."""
    images: List[str]  # list of base64 strings


# ── Attendance Sessions ─────────────────────────────────────────────────────────
class SessionOut(BaseModel):
    id: int
    date: date
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str

    @validator("status", pre=True)
    @classmethod
    def _coerce_status(cls, v):
        """Convert ORM enum to its string value."""
        return v.value if hasattr(v, "value") else v

    class Config:
        from_attributes = True
        orm_mode = True


class AttendanceLogOut(BaseModel):
    id: int
    session_id: int
    student_id: int
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    timestamp: Optional[datetime] = None
    status: str

    class Config:
        from_attributes = True


class OverrideRequest(BaseModel):
    session_id: int
    student_id: int
    status: str  # "present" or "absent"


class SessionSummary(BaseModel):
    session_id: int
    total_students: int
    present_count: int
    absent_count: int
    logs: List[AttendanceLogOut]


# ── Reports ─────────────────────────────────────────────────────────────────────
class StudentAttendanceReport(BaseModel):
    student_id: int
    student_name: str
    roll_number: str
    total_sessions: int
    attended: int
    percentage: float
