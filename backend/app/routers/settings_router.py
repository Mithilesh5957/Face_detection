from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import SystemSettings, User, RoleEnum
from app.schemas import SettingsResponse, SettingsUpdate
from app.auth import get_current_user

router = APIRouter()

async def get_or_create_settings(db: AsyncSession) -> SystemSettings:
    result = await db.execute(select(SystemSettings))
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = SystemSettings()
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    
    return settings

@router.get("/", response_model=SettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Get the current global system settings. Accessible by anyone logged in, or maybe public for the stream."""
    return await get_or_create_settings(db)

@router.put("/", response_model=SettingsResponse)
async def update_settings(
    settings_data: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update system settings. Only admins can do this."""
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    settings = await get_or_create_settings(db)
    
    update_data = settings_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)
        
    await db.commit()
    await db.refresh(settings)
    
    return settings
