import os
import re
import json
import fitz # 

from google import genai
from groq import Groq
from django.conf import settings

client_genai = genai.Client(
    api_key=os.getenv('GEMINI_API_KEY'),
    http_options={'api_version': 'v1beta'},
)
groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))

# ── Available models ────────────────────────────────────────
MODELS = {
    'llama-3.3-70b': {
        'id':          'llama-3.3-70b-versatile',   # FIX: was 'llama3-70b-8192' (decommissioned)
        'provider':    'groq',
        'label':       'Llama 3.3 70B',
        'description': 'Best quality, great for complex topics',
    },
    'llama-3.1-8b': {
        'id':          'llama-3.1-8b-instant',
        'provider':    'groq',
        'label':       'Llama 3.1 8B',
        'description': 'Fastest response, good for simple questions',
    },
    'mixtral-8x7b': {
        'id':          'mixtral-8x7b-32768',
        'provider':    'groq',
        'label':       'Mixtral 8x7B',
        'description': 'Great for coding and technical topics',
    },
    'gemma2-9b': {
        'id':          'gemma2-9b-it',
        'provider':    'groq',
        'label':       'Gemma 2 9B',
        'description': 'Google model, good for reasoning',
    },
}

DEFAULT_MODEL = 'llama-3.3-70b'

TOPIC_KEYWORDS = {
    'Algorithms': [
        'binary search', 'quicksort', 'merge sort', 'bubble sort', 'sorting',
        'dijkstra', 'bfs', 'dfs', 'dynamic programming', 'recursion',
        'tree', 'graph', 'heap', 'stack', 'queue', 'linked list',
        'time complexity', 'big o', 'space complexity',
    ],
    'Programming': [
        'python', 'javascript', 'java', 'c++', 'typescript', 'rust',
        'function', 'class', 'object', 'api', 'async', 'await',
        'code', 'debug', 'variable', 'loop', 'array', 'list',
        'django', 'react', 'flask', 'node', 'express',
    ],
    'Math': [
        'integral', 'derivative', 'matrix', 'linear algebra', 'calculus',
        'probability', 'statistics', 'equation', 'theorem', 'proof',
        'vector', 'eigenvalue', 'gradient', 'fourier',
    ],
    'Physics': [
        'force', 'velocity', 'acceleration', 'energy', 'momentum',
        'quantum', 'relativity', 'gravity', 'wave', 'particle',
        'thermodynamics', 'entropy', 'electromagnetic',
    ],
    'Database': [
        'sql', 'query', 'table', 'join', 'index', 'schema',
        'postgresql', 'mysql', 'mongodb', 'nosql', 'orm',
        'migration', 'transaction', 'normalization',
    ],
    'Geography': [
        'where is', 'location', 'country', 'city', 'capital',
        'campus', 'kathmandu', 'nepal', 'continent', 'map',
        'district', 'province', 'address', 'place', 'region',
    ],
}


def detect_topic(text: str) -> str:
    text_lower = text.lower()
    for topic, keywords in TOPIC_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                return topic
    return 'General'


def generate_embedding(text: str) -> list:
    try:
        result = client_genai.models.embed_content(
            model='gemini-embedding-001',
            contents=text,
        )
        return result.embeddings[0].values
    except Exception as e:
        print(f'Embedding error: {e}')
        return None


def get_groq_response(messages: list, system_prompt: str = None, model_key: str = DEFAULT_MODEL) -> str:
    try:
        model_id = MODELS.get(model_key, MODELS[DEFAULT_MODEL])['id']
        system   = system_prompt or (
            'You are ManageAI, a friendly and knowledgeable AI assistant with memory. '
            'Be clear, helpful, and concise. Use markdown and code blocks when appropriate.'
        )
        full_messages = [{'role': 'system', 'content': system}] + messages

        response = groq_client.chat.completions.create(
            model=model_id,
            messages=full_messages,
            max_tokens=1024,
            temperature=0.7,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f'Groq error: {e}')
        return f'Sorry, I encountered an error: {str(e)}'


def generate_memory_summary(question: str, answer: str) -> str:
    try:
        response = groq_client.chat.completions.create(
            model=MODELS[DEFAULT_MODEL]['id'],
            messages=[{
                'role': 'user',
                'content': (
                    f'Summarize this Q&A in 2-3 short bullet points:\n\n'
                    f'Q: {question}\nA: {answer}\n\nJust the bullets, nothing else.'
                ),
            }],
            max_tokens=200,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f'Summary error: {e}')
        return ''


def generate_flashcard(question: str, answer: str) -> dict:
    try:
        response = groq_client.chat.completions.create(
            model=MODELS[DEFAULT_MODEL]['id'],
            messages=[{
                'role': 'user',
                'content': (
                    f'Convert this Q&A into a flashcard.\n'
                    f'Return ONLY a JSON object with keys "front" (max 15 words) '
                    f'and "back" (max 50 words). No extra text.\n\n'
                    f'Q: {question}\nA: {answer}\n\nJSON:'
                ),
            }],
            max_tokens=150,
        )
        text = response.choices[0].message.content.strip()
        text = text.replace('```json', '').replace('```', '').strip()
        return json.loads(text)
    except Exception as e:
        print(f'Flashcard error: {e}')
        return {'front': question[:100], 'back': answer[:200]}

# ─── helpers ─────────────────────────────────────────────────────────────────
 
def extract_text_by_page(pdf_bytes: bytes) -> list[dict]:
    """Return [{page: int, text: str}, ...] for every page."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = []
    for i, page in enumerate(doc):
        text = page.get_text("text").strip()
        if text:
            pages.append({"page": i + 1, "text": text})
    return pages
 
 
def chunk_pages(pages: list[dict], max_chars: int = 1500) -> list[dict]:
    """
    Split each page's text into ~max_chars chunks (split on sentence boundary).
    Returns [{page, content}, ...]
    """
    chunks = []
    for p in pages:
        text = p["text"]
        # split on sentence endings
        sentences = re.split(r'(?<=[.!?])\s+', text)
        current, current_len = [], 0
        for sent in sentences:
            if current_len + len(sent) > max_chars and current:
                chunks.append({"page": p["page"], "content": " ".join(current)})
                current, current_len = [], 0
            current.append(sent)
            current_len += len(sent) + 1
        if current:
            chunks.append({"page": p["page"], "content": " ".join(current)})
    return chunks
 
 
def embed_text(text: str) -> list[float]:
    """Embed a single text string via Gemini embedding-001 (3072-d)."""
    result = client_genai.models.embed_content(
        model="gemini-embedding-001",
        contents=text
    )
    return result.embeddings[0].values
 
 
# ─── summary ─────────────────────────────────────────────────────────────────
 
def generate_summary(full_text: str, user_prompt: str, groq_client, model: str) -> str:
    """
    Summarise the PDF. If user_prompt is given, it steers the summary focus.
    Returns plain-text summary (markdown OK).
    """
    system = (
        "You are an expert summariser. Given the text of a PDF document, "
        "produce a clear, structured summary in markdown. "
        "Include: key topics, main arguments, important facts, and a one-line TL;DR at the top."
    )
    user_content = f"PDF content:\n\n{full_text[:12000]}"  # ~12k chars fits well
    if user_prompt:
        user_content += f"\n\nAdditional focus from the user: {user_prompt}"
 
    response = groq_client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
        max_tokens=1200,
    )
    return response.choices[0].message.content
 
 
# ─── quiz generation ─────────────────────────────────────────────────────────
 
DIFFICULTY_PROMPTS = {
    "beginner": (
        "Create 5 BEGINNER-level multiple choice questions. "
        "Focus on basic recall of key terms, definitions, and facts from the text. "
        "Questions should be answerable by someone who just skimmed the document."
    ),
    "intermediate": (
        "Create 5 INTERMEDIATE-level multiple choice questions. "
        "Focus on understanding relationships, cause-and-effect, and main ideas. "
        "Require the reader to have understood the document, not just skimmed it."
    ),
    "advanced": (
        "Create 5 ADVANCED-level multiple choice questions. "
        "Focus on application — ask the reader to apply concepts from the text to "
        "new scenarios, compare ideas, or identify implications."
    ),
    "expert": (
        "Create 5 EXPERT-level multiple choice questions. "
        "Focus on synthesis and critical analysis — require the reader to evaluate "
        "arguments, spot assumptions, integrate multiple ideas, or critique claims."
    ),
}
 
 
def generate_quiz_for_level(
    full_text: str, difficulty: str, groq_client, model: str
) -> list[dict]:
    """
    Returns a list of question dicts:
    [{question, options: [str,str,str,str], answer: "A"|"B"|"C"|"D", explanation}, ...]
    """
    level_instruction = DIFFICULTY_PROMPTS[difficulty]
 
    system = (
        "You are a quiz-maker. Given document text, generate multiple choice questions. "
        "Respond ONLY with a valid JSON array — no markdown fences, no preamble. "
        "Each element must have exactly these keys: "
        '"question" (string), '
        '"options" (array of exactly 4 strings, each starting with "A. ", "B. ", "C. ", "D. "), '
        '"answer" (one of "A", "B", "C", "D"), '
        '"explanation" (one sentence explaining why the answer is correct).'
    )
 
    user_content = (
        f"Document text:\n\n{full_text[:10000]}\n\n"
        f"Task: {level_instruction}"
    )
 
    response = groq_client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
        max_tokens=2000,
    )
 
    raw = response.choices[0].message.content.strip()
    # strip accidental markdown fences
    raw = re.sub(r"^```[a-z]*\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)
 
    questions = json.loads(raw)
    return questions
 