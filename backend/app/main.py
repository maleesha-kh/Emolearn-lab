from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.game_sessions import router as game_sessions_router
from app.api.routes.players import router as players_router
from app.api.routes.predict import router as predict_router
from app.db.database import init_db
from app.ml.face_branch.inference import load_face_model
from app.ml.pose_branch.inference import load_pose_model
from app.ml.preprocessing import load_rembg_session


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create database tables, then load the face model, pose model,
    # and rembg session up front, so we don't have to reload them from disk
    # on every request.
    init_db()
    load_pose_model()
    load_face_model()
    load_rembg_session()
    yield
    # Shutdown: no cleanup needed for this project


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router)
app.include_router(players_router)
app.include_router(game_sessions_router)

@app.get("/")
def health_check():
    return {"status": "backend is running"}