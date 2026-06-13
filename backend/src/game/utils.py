import json
import os
from chat.utils import client_genai


def generate_quiz(topic_name: str, description: str = "", pdf_text: str = "") -> dict:
    prompt_path = os.path.join(os.path.dirname(__file__), "GAME_PROMPT.txt")
    with open(prompt_path) as f:
        system_prompt = f.read()

    quiz_context = (
        f"TOPIC NAME:\n{topic_name.strip()}\n\n"
        f"OPTIONAL DESCRIPTION:\n{description.strip() or 'No description provided.'}\n\n"
        f"OPTIONAL PDF CONTENT:\n{pdf_text.strip() or 'No PDF content provided.'}"
    )

    response = client_genai.models.generate_content(
        model="gemini-2.5-flash",
        contents=quiz_context,
        config={
            "system_instruction": system_prompt,
        },
    )
    raw = response.text.strip()
    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(raw)
