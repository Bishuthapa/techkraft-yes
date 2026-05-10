from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine
from . import models
from .routers import candidates, auth as auth_router
from dotenv import load_dotenv
load_dotenv()

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="TechKraft Recruitment API")

app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(auth_router.router)
app.include_router(candidates.router)

@app.get("/health")
def health():
    return {"status": "ok"}