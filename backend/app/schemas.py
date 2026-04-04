"""Pydantic schemas for request / response validation."""

from datetime import date, datetime
from typing import Optional, List

try:
    from pydantic import field_validator, BaseModel, ConfigDict, Field
    PYDANTIC_V2 = True
except ImportError:
    from pydantic import validator, BaseModel, Field
    PYDANTIC_V2 = False


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

    if PYDANTIC_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
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

    if PYDANTIC_V2:
        @field_validator("status", mode="before")
        @classmethod
        def _coerce_status(cls, v):
            """Convert ORM enum to its string value."""
            return v.value if hasattr(v, "value") else v

        model_config = ConfigDict(from_attributes=True)
    else:
        @validator("status", pre=True)
        @classmethod
        def _coerce_status(cls, v):
            """Convert ORM enum to its string value."""
            return v.value if hasattr(v, "value") else v

        class Config:
            orm_mode = True


class AttendanceLogOut(BaseModel):
    id: int
    session_id: int
    student_id: int
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    timestamp: Optional[datetime] = None
    status: str

    if PYDANTIC_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True


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


# ── System Settings ─────────────────────────────────────────────────────────────
class SettingsResponse(BaseModel):
    id: int
    fps_cap: int
    confidence_threshold: float
    auto_capture_delay_ms: int
    draw_bounding_boxes: bool

    class Config:
        from_attributes = True

class SettingsUpdate(BaseModel):
    fps_cap: Optional[int] = Field(None, ge=1, le=60)
    confidence_threshold: Optional[float] = Field(None, ge=0.1, le=1.0)
    auto_capture_delay_ms: Optional[int] = Field(None, ge=100, le=5000)
    draw_bounding_boxes: Optional[bool] = None


# ── Reports ─────────────────────────────────────────────────────────────────────
class StudentAttendanceReport(BaseModel):
    student_id: int
    student_name: str
    roll_number: str
    total_sessions: int
    attended: int
    percentage: float
