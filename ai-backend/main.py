from fastapi import FastAPI
from pydantic import BaseModel
from generate import get_response
from report import get_report
from typing import Any, Dict, List

app = FastAPI()

class PlayerData(BaseModel):
    gender: str
    age: int
    environment: str


class ReportPayload(BaseModel):
    userId: str
    progressReportId: str
    currentGameSession: Dict[str, Any]
    recentGameSessions: List[Dict[str, Any]] = []
    userProfile: Dict[str, Any]

@app.get("/health")
def health():
    return {"status": "ok", "message": "Hello Hackathon World","service":"Maybe you are looking for /docs"}

@app.post("/npc-questions")
def npc_questions(data: PlayerData):
    return get_response(data.dict())


@app.post("/report-generate")
def report(data: ReportPayload):
    return get_report(data.dict())
