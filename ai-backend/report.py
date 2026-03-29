import os
from typing import Any, Dict, List

from dotenv import load_dotenv
from openai import OpenAI
import requests

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

CANONICAL_CATEGORIES = [
    "Burnout",
    "Uncertainty",
    "Stress",
    "Problem‑focused",
    "Emotion‑focused",
    "Avoidant",
    "Social support",
    "External attribution",
    "Meaning‑focused",
]

CATEGORY_FACTORS = {
    "Burnout": (
        "Reflects emotional exhaustion, loss of motivation, and feeling drained by ongoing demands, "
        "beyond simple tiredness."
    ),
    "Stress": (
        "Reflects feeling overwhelmed, pressured, or over‑loaded by current demands, with heightened "
        "arousal and tension."
    ),
    "Uncertainty": (
        "Reflects discomfort or anxiety about not knowing what will happen next, or being unable to "
        "predict or control the future."
    ),
    "Problem‑focused": (
        "Reflects concrete, action‑oriented steps to change or solve the situation "
        "(planning, problem‑solving, taking control)."
    ),
    "Emotion‑focused": (
        "Reflects strategies aimed at regulating emotional distress (acceptance, reappraisal, "
        "emotional support) without changing the situation itself."
    ),
    "Avoidant": (
        "Reflects tendencies to avoid, withdraw from, or ignore the problem or associated feelings "
        "(distraction, denial, procrastination)."
    ),
    "Social support": (
        "Reflects turning to others for emotional comfort, advice, or practical help, or relying on "
        "relationships to cope."
    ),
    "External attribution": (
        "Reflects attributing the cause mainly to external/situational forces "
        "(system, others, luck) rather than personal agency or problem‑solving."
    ),
    "Meaning‑focused": (
        "Reflects reframing the situation by drawing on beliefs, values, or purpose to find meaning "
        "or growth in adversity."
    ),
}


def _normalize_category(category: str) -> str:
    value = category.strip().lower()
    for ch in ("\u2011", "\u2010", "\u2012", "\u2013", "\u2014"):
        value = value.replace(ch, "-")
    value = value.replace("-", " ")
    value = " ".join(value.split())
    return value


def _category_map() -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    for canonical in CANONICAL_CATEGORIES:
        mapping[_normalize_category(canonical)] = canonical
    mapping["social-support"] = "Social support"
    mapping["social support"] = "Social support"
    mapping["external-attribution"] = "External attribution"
    mapping["external attribution"] = "External attribution"
    mapping["problem focused"] = "Problem‑focused"
    mapping["emotion focused"] = "Emotion‑focused"
    mapping["meaning focused"] = "Meaning‑focused"
    return mapping


def _extract_categories(questions: List[Dict[str, Any]]) -> List[str]:
    mapping = _category_map()
    categories: List[str] = []
    for q in questions:
        selected = q.get("selectedAnswer") or {}
        raw = selected.get("category")
        if not raw:
            continue
        key = _normalize_category(str(raw))
        canonical = mapping.get(key)
        if canonical:
            categories.append(canonical)
    return categories


def _counts(categories: List[str]) -> Dict[str, int]:
    counts = {c: 0 for c in CANONICAL_CATEGORIES}
    for cat in categories:
        if cat in counts:
            counts[cat] += 1
    return counts


def _percentages(counts: Dict[str, int]) -> Dict[str, float]:
    total = sum(counts.values())
    if total == 0:
        return {c: 0.0 for c in CANONICAL_CATEGORIES}
    return {c: counts[c] / total for c in CANONICAL_CATEGORIES}


def _blend_scores(current: Dict[str, float], recent: Dict[str, float]) -> Dict[str, float]:
    return {c: 0.5 * current[c] + 0.5 * recent[c] for c in CANONICAL_CATEGORIES}

def _level(score: float) -> str:
    if score >= 0.5:
        return "High"
    if score >= 0.25:
        return "Medium"
    return "Low"


def get_report(payload: Dict[str, Any]) -> Dict[str, Any]:
    progress_report_id = payload.get("progressReportId")
    current_session = payload.get("currentGameSession") or {}
    recent_sessions = payload.get("recentGameSessions") or []

    current_questions = current_session.get("questions") or []
    recent_questions: List[Dict[str, Any]] = []
    for session in recent_sessions:
        recent_questions.extend(session.get("questions") or [])

    current_categories = _extract_categories(current_questions)
    recent_categories = _extract_categories(recent_questions)

    current_pct = _percentages(_counts(current_categories))
    recent_pct = _percentages(_counts(recent_categories))
    blended = _blend_scores(current_pct, recent_pct)

    burnout_level = _level(blended["Burnout"])
    stress_level = _level(blended["Stress"])
    uncertainty_level = _level(blended["Uncertainty"])

    system_prompt = f"""
You are an assistant generating a concise mental-wellbeing progress report and feedback.

Use the following exact categories and their factors:
- Burnout: {CATEGORY_FACTORS["Burnout"]}
- Stress: {CATEGORY_FACTORS["Stress"]}
- Uncertainty: {CATEGORY_FACTORS["Uncertainty"]}
- Problem‑focused: {CATEGORY_FACTORS["Problem‑focused"]}
- Emotion‑focused: {CATEGORY_FACTORS["Emotion‑focused"]}
- Avoidant: {CATEGORY_FACTORS["Avoidant"]}
- Social support: {CATEGORY_FACTORS["Social support"]}
- External attribution: {CATEGORY_FACTORS["External attribution"]}
- Meaning‑focused: {CATEGORY_FACTORS["Meaning‑focused"]}

Weights:
- Current game session contributes 50%.
- Recent game sessions (combined) contribute 50%.

Write:
- "analysis": 2-3 lines, neutral and supportive, no diagnosis, no medical claims.
- "feedback": 2-4 short sentences with actionable tone.
Return JSON only with fields: analysis, feedback.
"""

    user_prompt = {
        "userProfile": payload.get("userProfile"),
        "currentSessionMeta": {
            "totalQuestions": current_session.get("totalQuestions"),
            "status": current_session.get("status"),
            "startedAt": current_session.get("startedAt"),
            "completedAt": current_session.get("completedAt"),
        },
        "recentSessionCount": len(recent_sessions),
        "categoryPercentages": {
            "current": current_pct,
            "recent": recent_pct,
            "blended": blended,
        },
        "priorityLevels": {
            "Burnout": burnout_level,
            "Stress": stress_level,
            "Uncertainty": uncertainty_level,
        },
    }

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": str(user_prompt)},
        ],
        response_format={"type": "json_object"},
    )

    reply = response.choices[0].message.content
    if reply is None:
        raise ValueError("OpenAI response content is None")

    import json
    llm_payload = json.loads(reply)

    report = {
        "burnout": burnout_level,
        "stress": stress_level,
        "uncertainty": uncertainty_level,
        "analysis": llm_payload.get("analysis", ""),
    }

    result = {
        "progressReportId": progress_report_id,
        "report": report,
        "feedback": llm_payload.get("feedback", ""),
    }

    try:
        nestResponse = requests.post(
            "http://100.54.109.124/api/progress-reports/complete",
            json=result,
            timeout=60,)
        print('status',nestResponse.status)
        print('message',nestResponse.text)
    except requests.RequestException:
        pass

    return result
