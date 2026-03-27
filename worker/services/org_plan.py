"""
Effective org plan (mirrors web/src/lib/org-plan.ts) for worker-side gating.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

_VALID = frozenset({"free", "starter", "pro", "team", "enterprise"})


def _dev_plan_bypass_runtime_enabled() -> bool:
    env = os.getenv("ENVIRONMENT", os.getenv("ENV", "")).strip().lower()
    flag = os.getenv("EMBEDFLOW_ALLOW_PLAN_BYPASS", "").strip().lower()
    return env == "development" or flag in ("1", "true", "yes")


def dev_plan_override() -> str | None:
    """Same semantics as Next.js `devPlanOverride()` (pitch, enterprise model, etc.)."""
    if not _dev_plan_bypass_runtime_enabled():
        return None
    raw = os.getenv("EMBEDFLOW_DEV_PLAN_OVERRIDE", "").strip().lower()
    if not raw or raw not in _VALID:
        return None
    return raw


def effective_org_plan(db_plan: str | None, plan_expires_at: str | None) -> str:
    o = dev_plan_override()
    if o is not None:
        return o

    raw = (db_plan or "free").strip().lower()
    p = raw if raw in _VALID else "free"
    if p == "free":
        return "free"
    if not plan_expires_at or not str(plan_expires_at).strip():
        return p
    try:
        exp = datetime.fromisoformat(str(plan_expires_at).replace("Z", "+00:00"))
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp <= datetime.now(timezone.utc):
            return "free"
    except ValueError:
        pass
    return p
