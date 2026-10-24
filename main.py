from pathlib import Path

import requests
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
MODEL = "llama3.2:1b"

app = FastAPI(title="NICO JARVIS")

SYSTEM_PROMPT = """
You are NICO JARVIS, a helpful personal AI assistant.
Speak naturally and clearly.
Give practical answers and explain difficult topics simply.
If you do not know something, say so.
You cannot claim to have performed actions you have not performed.
You may answer questions, but you cannot control the computer in this version.
"""

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)

@app.get("/api/health")
def health():
    return {"status": "online", "assistant": "NICO JARVIS"}

@app.post("/api/chat")
def chat(data: ChatRequest):
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": data.message},
                ],
                "stream": False,
            },
            timeout=180,
        )
        response.raise_for_status()
        result = response.json()
        answer = result.get("message", {}).get("content", "").strip()

        if not answer:
            raise HTTPException(
                status_code=502,
                detail="The AI returned an empty response."
            )

        return {"reply": answer}

    except requests.ConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Ollama is not running. Start Ollama and try again."
        )
    except requests.Timeout:
        raise HTTPException(
            status_code=504,
            detail="The AI took too long to respond. Try a smaller model."
        )
    except requests.RequestException:
        raise HTTPException(
            status_code=502,
            detail="Could not get a response from the local AI model."
        )

app.mount(
    "/",
    StaticFiles(directory=BASE_DIR / "static", html=True),
    name="static",
)
