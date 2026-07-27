"""
assessment_scoring.py — Generic, data-driven assessment scoring engine
------------------------------------------------------------------
Pure functions: given an instrument's scoring_rules / interpretation_rules
/ risk_rules (as stored on assessment_versions or assessment_templates)
plus a patient's raw answers, compute the total score, any subscale
scores, the interpretation band, and any triggered risk flags.

No DB access here — callers (repositories) fetch the JSON, this module
just evaluates it. Deliberately does not use eval()/exec() anywhere;
risk_rules conditions are parsed with a small fixed grammar instead.
"""

from __future__ import annotations

import re
from typing import Any


class ScoringError(ValueError):
    pass


def _reverse(value: int, formula: str | None) -> int:
    if not formula:
        return value
    m = re.match(r"^\s*(-?\d+)\s*-\s*value\s*$", formula)
    if not m:
        raise ScoringError(f"Unsupported reverse_formula: {formula!r}")
    return int(m.group(1)) - value


def _score_sum(answers: dict[int, int], rules: dict[str, Any]) -> tuple[int, None]:
    return sum(answers.values()), None


def _score_sum_with_reverse(answers: dict[int, int], rules: dict[str, Any]) -> tuple[int, None]:
    reverse_items = set(rules.get("reverse_items") or [])
    formula = rules.get("reverse_formula")
    total = sum(
        _reverse(v, formula) if qid in reverse_items else v
        for qid, v in answers.items()
    )
    return total, None


def _score_sum_times_multiplier(answers: dict[int, int], rules: dict[str, Any]) -> tuple[int, None]:
    multiplier = rules.get("multiplier", 1)
    return sum(answers.values()) * multiplier, None


def _score_subscale_average(answers: dict[int, int], rules: dict[str, Any]) -> tuple[float, dict[str, float]]:
    reverse_items = set(rules.get("reverse_items") or [])
    formula = rules.get("reverse_formula")
    subscales = rules.get("subscales") or {}
    subscale_scores: dict[str, float] = {}
    for name, spec in subscales.items():
        item_ids = spec.get("items") or []
        values = []
        for qid in item_ids:
            v = answers.get(qid)
            if v is None:
                continue
            values.append(_reverse(v, formula) if qid in reverse_items else v)
        subscale_scores[name] = round(sum(values) / len(values), 1) if values else 0.0
    overall = round(sum(subscale_scores.values()) / len(subscale_scores), 1) if subscale_scores else 0.0
    return overall, subscale_scores


def _score_threshold_count(answers: dict[int, int], rules: dict[str, Any]) -> tuple[int, None]:
    """Count items whose answer meets or exceeds a per-item threshold.

    Used by screeners like ASRS Part A, where different items are
    "positive" at different response levels rather than being summed.
    """
    thresholds = {int(k): v for k, v in (rules.get("thresholds") or {}).items()}
    count = sum(1 for qid, v in answers.items() if qid in thresholds and v >= thresholds[qid])
    return count, None


_SCORERS = {
    "sum": _score_sum,
    "sum_with_reverse": _score_sum_with_reverse,
    "sum_times_multiplier": _score_sum_times_multiplier,
    "subscale_average": _score_subscale_average,
    "threshold_count": _score_threshold_count,
}


def _interpret(total_score: float, interpretation_rules: dict[str, Any] | None) -> str | None:
    if not interpretation_rules:
        return None
    for band in interpretation_rules.get("bands", []):
        if band["min"] <= total_score <= band["max"]:
            return band["label"]
    return None


_COMPARATORS = {
    ">=": lambda a, b: a >= b,
    "<=": lambda a, b: a <= b,
    "==": lambda a, b: a == b,
    ">": lambda a, b: a > b,
    "<": lambda a, b: a < b,
}
_CONDITION_RE = re.compile(
    r"^(question_(\d+)|total_score|any_subscale_average)\s*(>=|<=|==|>|<)\s*(-?\d+(?:\.\d+)?)$"
)


def _eval_single_condition(
    cond: str,
    *,
    answers: dict[int, int],
    total_score: float,
    subscale_scores: dict[str, float] | None,
) -> bool:
    cond = cond.strip()
    m = _CONDITION_RE.match(cond)
    if not m:
        raise ScoringError(f"Unsupported risk condition: {cond!r}")
    field, question_num, op, literal = m.groups()
    threshold = float(literal)
    compare = _COMPARATORS[op]
    if field == "total_score":
        return compare(total_score, threshold)
    if field == "any_subscale_average":
        if not subscale_scores:
            return False
        return any(compare(v, threshold) for v in subscale_scores.values())
    value = answers.get(int(question_num))
    if value is None:
        return False
    return compare(value, threshold)


def _eval_condition(condition: str, **ctx: Any) -> bool:
    or_parts = re.split(r"\bOR\b", condition, flags=re.IGNORECASE)
    return any(_eval_single_condition(part, **ctx) for part in or_parts)


def score_assessment(
    *,
    scoring_rules: dict[str, Any] | None,
    interpretation_rules: dict[str, Any] | None,
    risk_rules: dict[str, Any] | None,
    answers: dict[str, int],
) -> dict[str, Any]:
    """Score a submitted assessment against its instrument's stored rules.

    `answers` is keyed by question id as a string (JSON payload keys are
    always strings); converted to int keys internally to match how
    scoring_rules/risk_rules reference question ids. Non-numeric answers
    (open-ended / free-text questions) are kept in the raw record but
    excluded from scoring math -- some instruments (e.g. multi-domain
    clinical interviews) have no single summed score at all, so answers
    must still be loggable even when scoring_rules is absent.
    """
    int_answers = {int(k): v for k, v in answers.items() if isinstance(v, int)}

    if not scoring_rules:
        return {
            "total_score": None,
            "subscale_scores": None,
            "interpretation_text": None,
            "risk_flags": [],
            "flagged": False,
        }

    scorer = _SCORERS.get(scoring_rules.get("type"))
    if scorer is None:
        raise ScoringError(f"Unsupported scoring_rules type: {scoring_rules.get('type')!r}")

    total_score, subscale_scores = scorer(int_answers, scoring_rules)
    interpretation_text = _interpret(total_score, interpretation_rules)

    risk_flags: list[dict[str, Any]] = []
    for rule in (risk_rules or {}).get("rules", []):
        try:
            triggered = _eval_condition(
                rule["condition"],
                answers=int_answers,
                total_score=total_score,
                subscale_scores=subscale_scores,
            )
        except ScoringError:
            continue
        if triggered:
            risk_flags.append(
                {
                    "id": rule.get("id"),
                    "flag": rule.get("flag"),
                    "risk_level": rule.get("risk_level"),
                    "message": rule.get("message"),
                }
            )

    return {
        "total_score": total_score,
        "subscale_scores": subscale_scores,
        "interpretation_text": interpretation_text,
        "risk_flags": risk_flags,
        "flagged": len(risk_flags) > 0,
    }
