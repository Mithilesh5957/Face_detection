-- MySQL initialization script (executed on first container start)
CREATE DATABASE IF NOT EXISTS attendance_db;
USE attendance_db;

-- Tables are created by SQLAlchemy ORM on FastAPI startup
-- This file exists as a fallback / reference

-- NOTE: The following tables are managed by SQLAlchemy:
-- users, students, attendance_sessions, attendance_logs
-- See backend/app/models.py for the authoritative schema.
