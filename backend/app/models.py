from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class Candidate(Base):
    __tablename__ = "candidates"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    role_applied = Column(String, index=True)
    status = Column(String, default="new", index=True)  # new/reviewed/hired/rejected/archived
    skills = Column(String)  # comma-separated
    internal_notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)  # soft delete
    scores = relationship("Score", back_populates="candidate")

class Score(Base):
    __tablename__ = "scores"
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), index=True)
    category = Column(String)
    score = Column(Integer)  # 1-5
    reviewer_id = Column(Integer, ForeignKey("users.id"))
    note = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    candidate = relationship("Candidate", back_populates="scores")
    reviewer = relationship("User")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="reviewer")  # NEVER accept from client