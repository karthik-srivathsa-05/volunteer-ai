"""
VolunteerAI - Flask Backend
Run: python app.py
Seed: python seed_data.py
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import json
import os
from groq import Groq

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), "volunteer.db")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
_groq_client = None

# --- SCHEMA ---------------------------------------------------------------

SCHEMA = """
CREATE TABLE IF NOT EXISTS volunteers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    bio TEXT NOT NULL,
    skills TEXT DEFAULT '[]',
    availability TEXT NOT NULL,
    city TEXT DEFAULT 'Bengaluru',
    languages TEXT DEFAULT '["English"]',
    reliability_score REAL DEFAULT 5.0,
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    required_skills TEXT DEFAULT '[]',
    ngo_name TEXT NOT NULL,
    date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    slots_needed INTEGER DEFAULT 2,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    volunteer_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    match_score INTEGER,
    match_reasoning TEXT,
    outreach_email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (volunteer_id) REFERENCES volunteers(id),
    UNIQUE(task_id, volunteer_id)
);
"""


# --- DB HELPERS -----------------------------------------------------------

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    db = get_db()
    db.executescript(SCHEMA)
    db.commit()
    db.close()


def seed_if_empty():
    """Seed the demo data only when the database is empty."""
    db = get_db()
    try:
        volunteer_count = db.execute("SELECT COUNT(*) FROM volunteers").fetchone()[0]
        task_count = db.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]
    finally:
        db.close()

    if volunteer_count == 0 and task_count == 0:
        from seed_data import seed
        seed()
        return True
    return False


def parse_json_fields(row, fields=("skills", "required_skills", "languages")):
    """Parse JSON string fields in a DB row dict."""
    d = dict(row) if not isinstance(row, dict) else row
    for f in fields:
        if f in d and isinstance(d[f], str):
            try:
                d[f] = json.loads(d[f])
            except Exception:
                pass
    return d


# --- AI SERVICES ----------------------------------------------------------

def get_groq_client():
    """Create the Groq client lazily so non-AI routes work without a key."""
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("Set GROQ_API_KEY to use AI routes.")
        _groq_client = Groq(api_key=api_key)
    return _groq_client


def clean_json_text(text: str) -> str:
    """Strip markdown fences if the model wraps JSON in a code block."""
    text = text.strip()
    if "```" in text:
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
    return text.strip()


def generate_groq_text(prompt: str, *, max_completion_tokens: int, json_mode: bool = False) -> str:
    client = get_groq_client()
    kwargs = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "You are a precise assistant that follows formatting instructions exactly."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "max_completion_tokens": max_completion_tokens,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = client.chat.completions.create(**kwargs)
    text = (response.choices[0].message.content or "").strip()
    if not text:
        raise RuntimeError("Groq returned an empty response")
    return text


def tokenize(text: str) -> set[str]:
    text = (text or "").lower()
    for ch in ",.;:!?()[]{}<>\"'":
        text = text.replace(ch, " ")
    stopwords = {
        "and", "or", "the", "a", "an", "to", "of", "for", "in", "on", "at", "with",
        "by", "from", "this", "that", "these", "those", "is", "are", "be", "as", "it",
        "into", "through", "we", "you", "their", "they", "your", "our", "will", "can",
    }
    return {tok for tok in text.split() if tok and len(tok) > 2 and tok not in stopwords}


def heuristic_match_volunteers(task: dict, volunteers: list) -> list:
    """Deterministic fallback when the LLM fails or returns unusable output."""
    if not volunteers:
        return []

    task_text = " ".join([
        task.get("title", ""),
        task.get("description", ""),
        " ".join(task.get("required_skills", []) or []),
        task.get("ngo_name", ""),
        task.get("date", ""),
        task.get("time_slot", ""),
    ])
    task_tokens = tokenize(task_text)
    required_tokens = tokenize(" ".join(task.get("required_skills", []) or []))

    scored = []
    for v in volunteers:
        vol_text = " ".join([
            v.get("name", ""),
            v.get("bio", ""),
            " ".join(v.get("skills", []) or []),
            " ".join(v.get("languages", []) or []),
            v.get("city", ""),
            v.get("availability", ""),
        ])
        vol_tokens = tokenize(vol_text)
        skill_hits = len(required_tokens & vol_tokens)
        semantic_hits = len(task_tokens & vol_tokens)
        reliability = float(v.get("reliability_score", 5))
        score = min(100, round((skill_hits * 18) + (semantic_hits * 3) + reliability * 2))

        overlap = sorted((required_tokens | task_tokens) & vol_tokens)
        if not overlap:
            overlap = sorted(vol_tokens & (tokenize(v.get("bio", "")) | tokenize(" ".join(v.get("skills", []) or []))))[:3]
        if not overlap:
            overlap = sorted(tokenize(" ".join(v.get("skills", []) or [])))[:3]
        if not overlap:
            overlap = ["reliability", "availability"]
        scored.append({
            "volunteer_id": v["id"],
            "match_score": score,
            "match_reasoning": (
                f"{v.get('name', 'This volunteer')} matches the task through {', '.join(overlap[:3])}. "
                f"They score well because their experience and reliability align with the task needs."
            ),
            "skill_overlap": overlap[:4],
            "volunteer": v,
        })

    scored.sort(key=lambda item: (item["match_score"], item["volunteer"].get("reliability_score", 0)), reverse=True)
    return scored[:3]


def normalize_matches(payload):
    """Accept either a raw list or a wrapped object with a matches key."""
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("matches", "data", "results"):
            if isinstance(payload.get(key), list):
                return payload[key]
    raise ValueError("Groq returned an unexpected match payload")


def heuristic_parse_task(raw_input: str) -> dict:
    """Best-effort parser when the LLM is unavailable."""
    text = (raw_input or "").strip()
    lower = text.lower()

    def pick_title():
        for prefix in ("need ", "looking for ", "help needed for ", "volunteers for "):
            if lower.startswith(prefix):
                return text[:60].strip(" ,.-")
        return (text[:48].strip(" ,.-") or "Volunteer Task")

    skills_map = {
        "python": "Python",
        "kannada": "Kannada",
        "hindi": "Hindi",
        "health": "Health Education",
        "first aid": "First Aid",
        "teacher": "Teaching",
        "teach": "Teaching",
        "design": "Graphic Design",
        "photo": "Photography",
        "legal": "Legal Aid",
        "account": "Accounting",
        "finance": "Nonprofit Finance",
        "data": "Data Analysis",
        "excel": "Excel",
        "social media": "Social Media",
        "yoga": "Yoga",
        "sports": "Sports Coaching",
        "environment": "Environmental Awareness",
    }

    required_skills = []
    for needle, label in skills_map.items():
        if needle in lower and label not in required_skills:
            required_skills.append(label)
    if not required_skills:
        required_skills = ["Volunteer Support", "Community Work"]

    slots_needed = 2
    for tok in lower.split():
        if tok.isdigit():
            slots_needed = max(1, min(int(tok), 50))
            break

    date = "TBD"
    for word in ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "today", "tomorrow"):
        if word in lower:
            date = word.title()
            break

    time_slot = "Flexible"
    if "am" in lower or "pm" in lower:
        time_slot = "As mentioned in the request"

    ngo_name = "Community Initiative"
    if "ngo" in lower or "foundation" in lower or "trust" in lower or "society" in lower:
        ngo_name = "Community Initiative"

    return {
        "title": pick_title(),
        "description": text if len(text) > 20 else "Volunteer support for a community task.",
        "required_skills": required_skills[:5],
        "ngo_name": ngo_name,
        "date": date,
        "time_slot": time_slot,
        "slots_needed": slots_needed,
    }


def heuristic_email(task: dict, volunteer: dict) -> str:
    """Template email used when the LLM is unavailable."""
    skills = ", ".join((volunteer.get("skills", []) or [])[:3]) or "their background"
    task_title = task.get("title", "the task")
    ngo_name = task.get("ngo_name", "our team")
    return (
        f"Hi {volunteer.get('name', 'there')},\n\n"
        f"We'd love to invite you to support {task_title} with {ngo_name}. "
        f"Your experience in {skills} stood out as a strong fit for the role.\n\n"
        f"If you're available, we'd be grateful to have you on board.\n\n"
        f"Best,\nThe {ngo_name} Team"
    )


def parse_task_nl(raw_input: str) -> dict:
    """Turn a free-text task description into a structured task dict."""
    prompt = f"""Parse this volunteer task description into structured JSON.
Return ONLY valid JSON - no markdown fences, no explanation.

Description: "{raw_input}"

Required format:
{{
  "title": "Short title, max 8 words",
  "description": "Clear 2-sentence description of what volunteers will do",
  "required_skills": ["skill1", "skill2", "skill3"],
  "ngo_name": "NGO name if mentioned, else 'Community Initiative'",
  "date": "Date in YYYY-MM-DD if mentioned, else 'TBD'",
  "time_slot": "Time range if mentioned, else 'Flexible'",
        "slots_needed": <integer number of volunteers needed, default 2>
}}"""
    try:
        text = generate_groq_text(
            prompt,
            max_completion_tokens=800,
            json_mode=True,
        )
        return json.loads(clean_json_text(text))
    except Exception as e:
        app.logger.warning("Groq parse fallback: %s", e)
        return heuristic_parse_task(raw_input)


def match_volunteers(task: dict, volunteers: list) -> list:
    """Semantically rank volunteers against a task. Returns top 3."""
    if not volunteers:
        return []

    vol_lines = []
    for v in volunteers[:45]:
        skills_str = v.get("skills", "[]")
        if not isinstance(skills_str, str):
            skills_str = json.dumps(skills_str)
        langs = v.get("languages", "[]")
        if not isinstance(langs, str):
            langs = json.dumps(langs)
        vol_lines.append(
            f"ID:{v['id']} | {v['name']} | "
            f"Skills:{skills_str} | "
            f"Bio:{str(v.get('bio', ''))[:200]} | "
            f"Reliability:{v.get('reliability_score', 5)}/10 | "
            f"Languages:{langs}"
        )

    required = task.get("required_skills", "[]")
    if not isinstance(required, str):
        required = json.dumps(required)

    text = generate_groq_text(
        f"""You are a volunteer coordinator AI. Match volunteers to this task using SEMANTIC understanding.
"Python developer" matches "data literacy trainer". "Medical student" matches "health educator". Go beyond keywords.

TASK:
Title: {task['title']}
Description: {task['description']}
Required Skills: {required}
NGO: {task['ngo_name']}
Date: {task['date']} | Time: {task['time_slot']}

AVAILABLE VOLUNTEERS:
{chr(10).join(vol_lines)}

Return TOP 3 matches. JSON only, no markdown:
[
  {{
    "volunteer_id": <integer id>,
    "match_score": <integer 0-100>,
    "match_reasoning": "Exactly 2 sentences. Be specific - reference their actual bio and skills. Explain WHY they fit this task.",
    "skill_overlap": ["specific_skill1", "specific_skill2"]
  }}
]""",
        max_completion_tokens=1400,
        json_mode=True,
    )
    return json.loads(clean_json_text(text))


def generate_outreach_email(task: dict, volunteer: dict) -> str:
    """Generate a personalized outreach email referencing the volunteer's background."""
    prompt = f"""Write a warm, specific volunteer outreach email (3-4 sentences).
Be concrete - reference their actual background. Explain why THEY specifically are a great fit.
Sign as "The {task['ngo_name']} Team". No subject line. No generic filler phrases.

TASK: {task['title']} | {task['ngo_name']} | {task['date']} | {task['time_slot']}
WHAT THEY'LL DO: {task['description']}

VOLUNTEER: {volunteer['name']}
THEIR BACKGROUND: {volunteer.get('bio', '')}

Write only the email body."""
    try:
        return generate_groq_text(
            prompt,
            max_completion_tokens=400,
            json_mode=False,
        )
    except Exception as e:
        app.logger.warning("Groq outreach fallback: %s", e)
        return heuristic_email(task, volunteer)


# --- ROUTES ---------------------------------------------------------------

@app.route("/api/stats")
def get_stats():
    db = get_db()
    try:
        avg_r = db.execute("SELECT AVG(reliability_score) FROM volunteers").fetchone()[0]
        return jsonify({
            "volunteers": db.execute("SELECT COUNT(*) FROM volunteers").fetchone()[0],
            "tasks": db.execute("SELECT COUNT(*) FROM tasks").fetchone()[0],
            "matches": db.execute("SELECT COUNT(*) FROM assignments").fetchone()[0],
            "avg_reliability": round(avg_r or 0, 1),
            "open_tasks": db.execute("SELECT COUNT(*) FROM tasks WHERE status='open'").fetchone()[0],
        })
    finally:
        db.close()


@app.route("/api/volunteers", methods=["GET"])
def get_volunteers():
    db = get_db()
    try:
        rows = db.execute("SELECT * FROM volunteers ORDER BY reliability_score DESC").fetchall()
        return jsonify([parse_json_fields(r) for r in rows])
    finally:
        db.close()


@app.route("/api/volunteers", methods=["POST"])
def create_volunteer():
    data = request.json
    db = get_db()
    try:
        db.execute(
            "INSERT INTO volunteers (name,email,bio,skills,availability,city,languages) VALUES (?,?,?,?,?,?,?)",
            (
                data["name"], data["email"], data["bio"],
                json.dumps(data.get("skills", [])),
                data["availability"],
                data.get("city", "Bengaluru"),
                json.dumps(data.get("languages", ["English"])),
            ),
        )
        db.commit()
        row = db.execute("SELECT * FROM volunteers WHERE email=?", (data["email"],)).fetchone()
        return jsonify(parse_json_fields(row)), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already registered"}), 409
    finally:
        db.close()


@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    db = get_db()
    try:
        tasks = db.execute("SELECT * FROM tasks ORDER BY created_at DESC").fetchall()
        result = []
        for t in tasks:
            task = parse_json_fields(t)
            asgns = db.execute(
                """SELECT a.*, v.name as vol_name, v.email as vol_email,
                          v.reliability_score as vol_reliability
                   FROM assignments a
                   JOIN volunteers v ON a.volunteer_id = v.id
                   WHERE a.task_id = ? AND a.status != 'no_show'""",
                (task["id"],),
            ).fetchall()
            task["assignments"] = [dict(a) for a in asgns]
            task["slots_filled"] = len(task["assignments"])
            result.append(task)
        return jsonify(result)
    finally:
        db.close()


@app.route("/api/tasks/parse", methods=["POST"])
def parse_task_route():
    data = request.json
    try:
        parsed = parse_task_nl(data["raw_input"])
        return jsonify(parsed)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/tasks", methods=["POST"])
def create_task():
    data = request.json
    db = get_db()
    try:
        if data.get("raw_input") and not data.get("title"):
            data.update(parse_task_nl(data["raw_input"]))
        db.execute(
            "INSERT INTO tasks (title,description,required_skills,ngo_name,date,time_slot,slots_needed) VALUES (?,?,?,?,?,?,?)",
            (
                data["title"], data["description"],
                json.dumps(data.get("required_skills", [])),
                data["ngo_name"], data["date"], data["time_slot"],
                data.get("slots_needed", 2),
            ),
        )
        db.commit()
        row = db.execute("SELECT * FROM tasks ORDER BY id DESC LIMIT 1").fetchone()
        task = parse_json_fields(row)
        task["assignments"] = []
        task["slots_filled"] = 0
        return jsonify(task), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@app.route("/api/tasks/<int:task_id>/match", methods=["POST"])
def match_task(task_id):
    db = get_db()
    try:
        task_row = db.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
        if not task_row:
            return jsonify({"error": "Task not found"}), 404

        task = parse_json_fields(task_row)

        already_assigned = [
            r[0] for r in db.execute(
                "SELECT volunteer_id FROM assignments WHERE task_id=? AND status!='no_show'",
                (task_id,),
            ).fetchall()
        ]

        all_vols = [parse_json_fields(v) for v in db.execute(
            "SELECT * FROM volunteers ORDER BY reliability_score DESC"
        ).fetchall()]
        available = [v for v in all_vols if v["id"] not in already_assigned]

        try:
            matches = normalize_matches(match_volunteers(task, available))
            if not matches:
                raise ValueError("Empty match list")
        except Exception as e:
            app.logger.warning("Groq match fallback for task %s: %s", task_id, e)
            matches = heuristic_match_volunteers(task, available)

        vol_map = {v["id"]: v for v in all_vols}
        for m in matches:
            m["volunteer"] = vol_map.get(m["volunteer_id"], {})

        return jsonify(matches)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@app.route("/api/tasks/<int:task_id>/assign", methods=["POST"])
def assign_volunteer(task_id):
    data = request.json
    volunteer_id = data["volunteer_id"]
    db = get_db()
    try:
        task = parse_json_fields(db.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone())
        volunteer = parse_json_fields(db.execute("SELECT * FROM volunteers WHERE id=?", (volunteer_id,)).fetchone())

        email = generate_outreach_email(task, volunteer)

        db.execute(
            "INSERT OR REPLACE INTO assignments (task_id,volunteer_id,status,match_score,match_reasoning,outreach_email) VALUES (?,?,?,?,?,?)",
            (task_id, volunteer_id, "pending", data.get("match_score"), data.get("match_reasoning"), email),
        )
        db.commit()
        return jsonify({"email": email, "status": "assigned"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@app.route("/api/assignments/<int:assignment_id>/status", methods=["PATCH"])
def update_status(assignment_id):
    data = request.json
    new_status = data["status"]
    db = get_db()
    try:
        asgn = db.execute("SELECT * FROM assignments WHERE id=?", (assignment_id,)).fetchone()
        if not asgn:
            return jsonify({"error": "Assignment not found"}), 404

        db.execute("UPDATE assignments SET status=? WHERE id=?", (new_status, assignment_id))

        if new_status in ("completed", "no_show"):
            vol_id = asgn["volunteer_id"]
            vol = db.execute("SELECT * FROM volunteers WHERE id=?", (vol_id,)).fetchone()
            total = vol["total_tasks"] + 1
            completed = vol["completed_tasks"] + (1 if new_status == "completed" else 0)
            score = round((completed / total) * 10, 1)
            db.execute(
                "UPDATE volunteers SET reliability_score=?,total_tasks=?,completed_tasks=? WHERE id=?",
                (score, total, completed, vol_id),
            )

        db.commit()
        return jsonify({"status": new_status})
    finally:
        db.close()


# --- MAIN ----------------------------------------------------------------

if __name__ == "__main__":
    init_db()
    seed_if_empty()
    print("Database ready ->", DB_PATH)
    print("Starting server at http://localhost:5000")
    app.run(debug=True, port=5000)
