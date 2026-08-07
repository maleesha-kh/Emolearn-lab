from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.predict import router as predict_router

app = FastAPI()

# React frontend එකට (localhost:5173) API එකට access දෙන්න
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router)

@app.get("/")
def health_check():
    return {"status": "backend is running"}