from fastapi import APIRouter, HTTPException, Body, Response
import tempfile
import os

try:
    from TTS.api import TTS  # ✅ correct import
except ImportError:
    raise ImportError("You must install coqui-tts: pip install TTS")

router = APIRouter()

# Load the model once at startup
tts_model = TTS("tts_models/en/ljspeech/tacotron2-DDC_ph")

@router.post("/tts/mozilla")
async def tts_mozilla(data: dict = Body(...)):
    content = data.get("content")
    if not content:
        raise HTTPException(status_code=400, detail="Missing 'content' in request body")

    # Create a temporary file to save the TTS output
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        # Generate TTS audio and save it
        tts_model.tts_to_file(text=content, file_path=tmp_path)

        # Read the generated WAV file
        with open(tmp_path, "rb") as f:
            audio_bytes = f.read()

        return Response(content=audio_bytes, media_type="audio/wav")
    finally:
        # Clean up the temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
