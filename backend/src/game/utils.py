import json
import os
from chat.utils import client_genai


def generate_quiz(pdf_text: str) -> dict:
    prompt_path = os.path.join(os.path.dirname(__file__), "GAME_PROMPT.txt")
    with open(prompt_path) as f:
        system_prompt = f.read()

    response = client_genai.models.generate_content(
        model="gemini-2.5-flash",
        contents=pdf_text,
        config={
            "system_instruction": system_prompt,
        },
    )
    raw = response.text.strip()
    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(raw)
