from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import MLModel
from ..schemas import MLModelOut
from ..auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[MLModelOut])
def list_models(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return db.query(MLModel).filter(MLModel.is_active == True).all()