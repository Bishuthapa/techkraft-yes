from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import asyncio, json
from ..database import get_db
from .. import models, schemas
from ..auth import get_current_user, require_admin

router = APIRouter(prefix="/candidates", tags=["candidates"])

@router.get("/")
def list_candidates(
    status: Optional[str] = None,
    role_applied: Optional[str] = None,
    skill: Optional[str] = None,
    keyword: Optional[str] = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Filter in DB — NOT in Python (see bug fix section)
    q = db.query(models.Candidate).filter(models.Candidate.deleted_at == None)
    if status:
        q = q.filter(models.Candidate.status == status)
    if role_applied:
        q = q.filter(models.Candidate.role_applied == role_applied)
    if skill:
        q = q.filter(models.Candidate.skills.contains(skill))
    if keyword:
        q = q.filter(models.Candidate.name.ilike(f"%{keyword}%"))
    total = q.count()
    candidates = q.offset(offset).limit(limit).all()
    return {"total": total, "offset": offset, "limit": limit, "items": [serialize(c, current_user) for c in candidates]}

@router.get("/{id}")
def get_candidate(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    c = db.query(models.Candidate).filter(models.Candidate.id == id, models.Candidate.deleted_at == None).first()
    if not c:
        raise HTTPException(404, "Candidate not found")
    return serialize(c, current_user, include_scores=True)

@router.post("/{id}/scores")
def add_score(id: int, score_in: schemas.ScoreCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not 1 <= score_in.score <= 5:
        raise HTTPException(400, "Score must be 1–5")
    c = db.query(models.Candidate).filter(models.Candidate.id == id).first()
    if not c:
        raise HTTPException(404, "Candidate not found")
    score = models.Score(candidate_id=id, category=score_in.category, score=score_in.score, reviewer_id=current_user.id, note=score_in.note)
    db.add(score); db.commit(); db.refresh(score)
    return score

@router.post("/{id}/summary")
async def generate_summary(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    c = db.query(models.Candidate).filter(models.Candidate.id == id).first()
    if not c:
        raise HTTPException(404, "Candidate not found")
    await asyncio.sleep(2)  # Mock LLM delay
    return {"summary": f"{c.name} applied for {c.role_applied}. Skills: {c.skills}. Status: {c.status}. Mock AI summary generated."}

@router.delete("/{id}")
def delete_candidate(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_admin)):
    c = db.query(models.Candidate).filter(models.Candidate.id == id).first()
    if not c:
        raise HTTPException(404, "Not found")
    c.deleted_at = datetime.utcnow()  # Soft delete — never hard delete
    db.commit()
    return {"detail": "Archived"}

def serialize(c: models.Candidate, user: models.User, include_scores=False):
    data = {
        "id": c.id, "name": c.name, "email": c.email,
        "role_applied": c.role_applied, "status": c.status,
        "skills": c.skills.split(",") if c.skills else [],
        "created_at": c.created_at,
    }
    if include_scores:
        scores = c.scores if user.role == "admin" else [s for s in c.scores if s.reviewer_id == user.id]
        data["scores"] = scores
    if user.role == "admin":
        data["internal_notes"] = c.internal_notes
    return data