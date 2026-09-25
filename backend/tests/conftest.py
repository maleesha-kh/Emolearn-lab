import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes.diary import router as diary_router
from app.api.routes.game_sessions import router as game_sessions_router
from app.api.routes.parent import router as parent_router
from app.api.routes.players import router as players_router
from app.db.database import Base, get_db


@pytest.fixture()
def db_client():
    """A TestClient wired to an isolated in-memory SQLite database, plus its
    session factory for tests that need to poke the database directly (e.g.
    setting finished_at to a specific date)."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app = FastAPI()
    app.include_router(players_router)
    app.include_router(game_sessions_router)
    app.include_router(parent_router)
    app.include_router(diary_router)
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c, TestingSessionLocal


@pytest.fixture()
def client(db_client):
    return db_client[0]
