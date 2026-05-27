"""
AI insight generator — three-tier provider chain:

  1. OpenRouter  (OPENROUTER_API_KEY)   — free-model gateway, multi-model fallback
  2. Hugging Face (HUGGINGFACE_API_KEY) — Inference Providers chat completion API
  3. Static fallback                    — random insight from fallback_data

Returns (insight_text, "live") on any provider success,
        (fallback_text, "fallback") when all providers are exhausted.

Logging rules:
  - never log API key values
  - always log provider name, HTTP status, and short error message
"""

import logging

import httpx

from app.core.config import settings
from app.utils import fallback_data

logger = logging.getLogger(__name__)

_TIMEOUT = 20.0
_DISCLAIMER = "This is not financial advice."


# ── Shared helpers ───────────────────────────────────────────────────────────

def _build_prompt(assets: list[str], investor_type: str) -> str:
    asset_str = ", ".join(assets)

    return (
        f"You are a concise crypto educator. "
        f"Write a 2-sentence educational observation about {asset_str} "
        f"for a {investor_type} investor, drawing on your general knowledge of these assets "
        f"and typical crypto market dynamics. "
        f"Do not reference live prices, recent news, or specific on-chain metrics — "
        f"speak only about general characteristics and dynamics that are typically relevant to these assets. "
        f"Do not recommend buying, selling, or any specific action. "
        f"Do not use phrases like 'buying opportunity', 'sell now', or 'buy now'. "
        f"Do not use bullet points. "
        f"End your response with exactly: This is not financial advice."
    )


def _normalise(raw: str) -> str:
    """Strip any duplicate disclaimer lines, then append exactly one."""
    lines = [ln for ln in raw.splitlines() if ln.strip() != _DISCLAIMER]
    body = " ".join(lines).strip()
    return f"{body} {_DISCLAIMER}"


# ── OpenRouter provider ──────────────────────────────────────────────────────

_OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Tried in order; first success wins. Free-tier models may 429 or go offline.
_OPENROUTER_MODELS = [
    "liquid/lfm-2.5-1.2b-instruct:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-v4-flash:free",
]


def _try_openrouter_model(client: httpx.Client, model: str, prompt: str) -> str | None:
    """Try a single OpenRouter model. Returns normalised content or None."""
    resp = client.post(
        _OPENROUTER_URL,
        headers={
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ai-crypto-advisor.app",
            "X-Title": "AI Crypto Advisor",
        },
        json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 120,
            "temperature": 0.7,
        },
    )

    if resp.status_code != 200:
        try:
            error_msg = resp.json().get("error", {}).get("message", resp.text[:120])
        except Exception:
            error_msg = resp.text[:120]
        logger.warning(
            "OpenRouter model %s — HTTP %s: %s", model, resp.status_code, error_msg,
        )
        return None

    data = resp.json()
    choices = data.get("choices") or []
    if not choices:
        logger.warning("OpenRouter model %s returned empty choices", model)
        return None

    content = (choices[0].get("message") or {}).get("content") or ""
    content = content.strip()
    if not content:
        logger.warning("OpenRouter model %s returned empty content", model)
        return None

    return _normalise(content)


def try_openrouter(assets: list[str], investor_type: str) -> str | None:
    """
    Try every OpenRouter model in order.
    Returns insight text on first success, None if all models fail.
    """
    if not settings.OPENROUTER_API_KEY:
        logger.debug("OPENROUTER_API_KEY not set — skipping OpenRouter")
        return None

    prompt = _build_prompt(assets, investor_type)
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            for model in _OPENROUTER_MODELS:
                result = _try_openrouter_model(client, model, prompt)
                if result:
                    logger.info("AI insight generated via OpenRouter (%s)", model)
                    return result

        logger.warning("All OpenRouter models failed — moving to next provider")
        return None

    except Exception as exc:
        logger.warning("OpenRouter connection error (%s) — moving to next provider", exc)
        return None


# ── Hugging Face provider ────────────────────────────────────────────────────

# OpenAI-compatible Inference Providers endpoint (router — api-inference subdomain may not resolve).
# Model is specified in the request body; HF routes to the right backend.
_HF_URL = "https://router.huggingface.co/v1/chat/completions"


def try_huggingface(assets: list[str], investor_type: str) -> str | None:
    """
    Try the Hugging Face Inference Providers chat completion API.
    Returns insight text on success, None on any error.
    """
    hf_key = settings.HUGGINGFACE_API_KEY.strip()
    model = settings.HUGGINGFACE_MODEL.strip() or "Qwen/Qwen2.5-7B-Instruct"

    logger.debug(
        "Hugging Face — key set: %s, model: %s", bool(hf_key), model,
    )

    if not hf_key:
        logger.debug("HUGGINGFACE_API_KEY not set — skipping Hugging Face")
        return None

    prompt = _build_prompt(assets, investor_type)

    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.post(
                _HF_URL,
                headers={
                    "Authorization": f"Bearer {hf_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 150,
                    "temperature": 0.7,
                },
            )

        if resp.status_code != 200:
            try:
                error_body = resp.json()
                error_msg = error_body.get("error", resp.text[:120])
            except Exception:
                error_msg = resp.text[:120]
            logger.warning(
                "Hugging Face model %s — HTTP %s: %s", model, resp.status_code, error_msg,
            )
            return None

        data = resp.json()
        choices = data.get("choices") or []
        if not choices:
            logger.warning("Hugging Face model %s returned empty choices", model)
            return None

        content = (choices[0].get("message") or {}).get("content") or ""
        content = content.strip()
        if not content:
            logger.warning("Hugging Face model %s returned empty content", model)
            return None

        logger.info("AI insight generated via Hugging Face (%s)", model)
        return _normalise(content)

    except Exception as exc:
        logger.warning("Hugging Face connection error (%s) — moving to next provider", exc)
        return None


# ── Public function ──────────────────────────────────────────────────────────

def get_ai_insight(assets: list[str], investor_type: str) -> tuple[str, str]:
    """
    Provider chain: OpenRouter → Hugging Face → static fallback.

    Returns:
        (insight_text, "live")     — any live provider succeeded
        (insight_text, "fallback") — all providers exhausted
    """
    result = try_openrouter(assets, investor_type)
    if result:
        return result, "live"

    result = try_huggingface(assets, investor_type)
    if result:
        return result, "live"

    logger.warning("All AI providers failed — using static fallback insight")
    return fallback_data.get_ai_insight(), "fallback"
