"""
AI insight generator via OpenRouter with fallback.

Requires OPENROUTER_API_KEY. If the key is absent or every model attempt fails,
a random insight from fallback_data is returned instead.

Returns (insight_text, "live") on success, (insight_text, "fallback") otherwise.

OpenRouter is an API gateway that supports many LLMs including free-tier
models. Docs: https://openrouter.ai/docs
"""

import logging

import httpx

from app.core.config import settings
from app.utils import fallback_data

logger = logging.getLogger(__name__)

_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
_TIMEOUT = 20.0

# Models tried in order; first success wins.
# Free-tier models can be rate-limited (429) or temporarily unavailable.
# List ordered by preference: fast first, larger as fallbacks.
_MODELS = [
    "liquid/lfm-2.5-1.2b-instruct:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-v4-flash:free",
]


def _build_prompt(assets: list[str], investor_type: str) -> str:
    asset_str = ", ".join(assets)
    return (
        f"You are a concise crypto market analyst. "
        f"Give a 2-sentence market observation for a {investor_type} investor "
        f"interested in {asset_str}. "
        f"Focus on recent market trends and on-chain signals. "
        f"Do not recommend buying, selling, or any specific action. "
        f"Do not use phrases like 'buying opportunity', 'sell now', or 'buy now'. "
        f"Do not use bullet points. "
        f"End your response with exactly: This is not financial advice."
    )


def _try_model(client: httpx.Client, model: str, prompt: str) -> str | None:
    """
    Attempt one model. Returns the content string on success, None otherwise.
    Logs status code and error message on failure (never logs the API key).
    """
    resp = client.post(
        _BASE_URL,
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
        error_msg = resp.json().get("error", {}).get("message", resp.text[:120])
        logger.warning(
            "OpenRouter model %s failed — HTTP %s: %s",
            model, resp.status_code, error_msg,
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

    # Normalise: remove any duplicate disclaimer lines the model may have echoed,
    # then ensure exactly one appears at the end.
    _DISCLAIMER = "This is not financial advice."
    lines = [ln for ln in content.splitlines() if ln.strip() != _DISCLAIMER]
    body = " ".join(lines).strip()
    return f"{body} {_DISCLAIMER}"


def get_ai_insight(assets: list[str], investor_type: str) -> tuple[str, str]:
    if not settings.OPENROUTER_API_KEY:
        logger.debug("OPENROUTER_API_KEY not set; using fallback insight")
        return fallback_data.get_ai_insight(), "fallback"

    logger.debug("OPENROUTER_API_KEY present; attempting live AI insight")
    prompt = _build_prompt(assets, investor_type)

    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            for model in _MODELS:
                content = _try_model(client, model, prompt)
                if content:
                    logger.info("OpenRouter insight generated via %s", model)
                    return content, "live"

        logger.warning("All OpenRouter models failed; using fallback insight")
        return fallback_data.get_ai_insight(), "fallback"

    except Exception as exc:
        logger.warning("OpenRouter request error (%s); using fallback insight", exc)
        return fallback_data.get_ai_insight(), "fallback"
