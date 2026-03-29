from fastapi import FastAPI
from pydantic import BaseModel
from generate import get_response

app = FastAPI()

class PlayerData(BaseModel):
    gender: str
    age: int
    environment: str

@app.get("/")
def health():
    return {"status": "ok", "message": "Hello Hackathon World","service":"Maybe you are looking for /docs"}

@app.post("/npc-questions")
def npc_questions(data: PlayerData):
    return get_response(data.dict())
