from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import StreamingResponse
from gtts import gTTS
import re
import io

router = APIRouter()

def split_text(text, max_chars=200):
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks, chunk = [], ""
    for sentence in sentences:
        if len(chunk) + len(sentence) <= max_chars:
            chunk += sentence + " "
        else:
            chunks.append(chunk.strip())
            chunk = sentence + " "
    if chunk:
        chunks.append(chunk.strip())
    return chunks

@router.post("/tts/google", response_class=StreamingResponse)
async def tts_google_stream(data: dict = Body(...)):
    content = data.get("content")
    if not content:
        raise HTTPException(status_code=400, detail="Missing 'content'")

    chunks = split_text(content)

    def audio_generator():
        for chunk in chunks:
            print(f"Streaming chunk: {chunk[:30]}...")
            tts = gTTS(text=chunk, lang="en")
            for audio_chunk in tts.stream():  # <- This is already a generator
                yield audio_chunk  # audio_chunk is bytes

    return StreamingResponse(audio_generator(), media_type="audio/mpeg")
