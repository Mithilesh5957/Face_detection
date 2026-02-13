"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import auth_router, students_router, attendance_router, reports_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    await init_db()

    # Create default admin if not exists
    from app.database import AsyncSessionLocal
    from app.models import User, RoleEnum
    from app.auth import hash_password
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.role == RoleEnum.admin))
        admin = result.scalar_one_or_none()
        if admin is None:
            admin_user = User(
                name="Admin",
                email="admin@college.edu",
                role=RoleEnum.admin,
                password_hash=hash_password("admin123"),
            )
            db.add(admin_user)
            await db.commit()
            print("✅ Default admin created: admin@college.edu / admin123")

    yield
    # Shutdown
    print("🛑 Shutting down...")


app = FastAPI(
    title="College Attendance System",
    description="Face-recognition based attendance tracking",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the Vite dev server and the Nginx container
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth_router.router, prefix="/api/auth", tags=["Auth"])
app.include_router(students_router.router, prefix="/api/students", tags=["Students"])
app.include_router(attendance_router.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(reports_router.router, prefix="/api/reports", tags=["Reports"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
