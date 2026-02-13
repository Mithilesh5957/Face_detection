"""SQLAlchemy ORM models for the attendance system."""

import enum
from datetime import date, datetime

from sqlalchemy import (
    Column, Integer, String, Enum, ForeignKey, Date,
    DateTime, LargeBinary, UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base


class RoleEnum(str, enum.Enum):
    admin = "admin"
    student = "student"


class SessionStatusEnum(str, enum.Enum):
    active = "active"
    completed = "completed"


class AttendanceStatusEnum(str, enum.Enum):
    present = "present"
    absent = "absent"


# ── Users ───────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.student)
    password_hash = Column(String(255), nullable=False)

    student = relationship("Student", back_populates="user", uselist=False)


# ── Students ────────────────────────────────────────────────────────────────────
class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    college_roll_number = Column(String(50), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    branch = Column(String(100), nullable=False)
    semester = Column(Integer, nullable=False)
    face_embedding = Column(LargeBinary, nullable=True)  # serialised numpy float32 array

    user = relationship("User", back_populates="student")
    attendance_logs = relationship("AttendanceLog", back_populates="student")


# ── Attendance Sessions ─────────────────────────────────────────────────────────
class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False, default=date.today)
    start_time = Column(DateTime, nullable=False, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    status = Column(Enum(SessionStatusEnum), nullable=False, default=SessionStatusEnum.active)

    logs = relationship("AttendanceLog", back_populates="session")


# ── Attendance Logs ─────────────────────────────────────────────────────────────
class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, nullable=True)
    status = Column(Enum(AttendanceStatusEnum), nullable=False, default=AttendanceStatusEnum.absent)

    session = relationship("AttendanceSession", back_populates="logs")
    student = relationship("Student", back_populates="attendance_logs")

    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_session_student"),
    )
