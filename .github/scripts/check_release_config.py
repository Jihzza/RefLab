"""Validate security-sensitive RefLab release configuration without network access."""

from __future__ import annotations

import argparse
import json
import re
import sys
import tomllib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def fail(message: str) -> None:
    raise SystemExit(f"Release configuration validation failed: {message}")


def validate_netlify() -> None:
    config = tomllib.loads((ROOT / "netlify.toml").read_text(encoding="utf-8"))
    build = config.get("build", {})
    expected = {
        "base": "apps/frontend",
        "command": "npm run build",
        "publish": "dist",
    }
    if {key: build.get(key) for key in expected} != expected:
        fail(f"netlify.toml [build] must include {expected!r}")
    if build.get("environment", {}).get("NODE_VERSION") != "22":
        fail("netlify.toml must pin NODE_VERSION to 22")

    redirects = config.get("redirects", [])
    if {"from": "/*", "to": "/index.html", "status": 200} not in redirects:
        fail("the SPA fallback redirect is missing")

    headers = {entry.get("for"): entry.get("values", {}) for entry in config.get("headers", [])}
    global_headers = headers.get("/*", {})
    required = {
        "Content-Security-Policy",
        "Cross-Origin-Opener-Policy",
        "Cross-Origin-Resource-Policy",
        "Permissions-Policy",
        "Referrer-Policy",
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "X-Frame-Options",
    }
    missing = sorted(required - global_headers.keys())
    if missing:
        fail(f"missing global security headers: {', '.join(missing)}")
    csp = global_headers["Content-Security-Policy"]
    if "fonts.googleapis.com" in csp or "fonts.gstatic.com" in csp:
        fail("fonts must be self-hosted")
    if re.search(r"(?:img-src|media-src)[^;]*\shttps:\s", csp):
        fail("image and media CSP sources must be host-scoped")
    for directive in ("script-src", "style-src", "connect-src", "frame-src"):
        match = re.search(rf"(?:^|;)\s*{directive}\s+([^;]+)", csp)
        if not match:
            fail(f"hCaptcha CSP directive is missing: {directive}")
        for hcaptcha_origin in ("https://hcaptcha.com", "https://*.hcaptcha.com"):
            if hcaptcha_origin not in match.group(1).split():
                fail(f"{directive} is missing hCaptcha origin: {hcaptcha_origin}")
    if headers.get("/assets/*", {}).get("Cache-Control") != "public, max-age=31536000, immutable":
        fail("fingerprinted assets must use immutable caching")


def validate_frontend() -> None:
    frontend = ROOT / "apps" / "frontend"
    package = json.loads((frontend / "package.json").read_text(encoding="utf-8"))
    scripts = package.get("scripts", {})
    expected = {
        "test": "vitest run",
        "test:e2e": "playwright test",
        "verify:i18n": "node scripts/verify-i18n.mjs",
        "audit:runtime": "npm audit --omit=dev --audit-level=moderate",
    }
    for name, command in expected.items():
        if scripts.get(name) != command:
            fail(f"frontend script {name!r} must be {command!r}")
    build = scripts.get("build", "")
    for command in ("verify:i18n", "tsc -b", "vite build"):
        if command not in build:
            fail(f"frontend build is missing {command!r}")

    styles = (frontend / "src" / "styles" / "globals.css").read_text(encoding="utf-8")
    if '@import "@fontsource-variable/inter"' not in styles or "fonts.googleapis.com" in styles:
        fail("Inter must be bundled locally")
    tokens = (frontend / "src" / "styles" / "tokens.css").read_text(encoding="utf-8")
    if '"Inter Variable"' not in tokens:
        fail("the typography token must reference Inter Variable")

    pricing = (frontend / "src" / "features" / "pricing" / "config.ts").read_text(encoding="utf-8")
    if "VITE_PAID_PLANS_ENABLED === 'true'" not in pricing:
        fail("paid plans must remain strict opt-in")
    auth_config = (frontend / "src" / "features" / "auth" / "config.ts").read_text(encoding="utf-8")
    if "VITE_GOOGLE_OAUTH_ENABLED === 'true'" not in auth_config:
        fail("Google OAuth must remain strict opt-in")
    for fragment in (
        "import.meta.env.VITE_CAPTCHA_ENABLED",
        "import.meta.env.VITE_HCAPTCHA_SITE_KEY",
        "enabledValue === 'true'",
        "configured: !enabled || siteKey.length > 0",
    ):
        if fragment not in auth_config:
            fail(f"hCaptcha strict opt-in configuration is missing {fragment!r}")
    if package.get("dependencies", {}).get("@hcaptcha/react-hcaptcha") != "2.0.2":
        fail("@hcaptcha/react-hcaptcha must be pinned exactly to 2.0.2")
    profiles = (frontend / "src" / "features" / "auth" / "api" / "profilesApi.ts").read_text(encoding="utf-8")
    if ".select('*')" in profiles or '.select("*")' in profiles:
        fail("profile reads must use an explicit safe column list")
    messages = (frontend / "src" / "features" / "messages" / "api" / "messagesApi.ts").read_text(encoding="utf-8")
    if "createSignedUrl" not in messages:
        fail("private message media must use signed URLs")


def validate_supabase() -> None:
    config = tomllib.loads((ROOT / "backend" / "supabase" / "config.toml").read_text(encoding="utf-8"))
    functions = config.get("functions", {})
    expected = {
        "stripe-webhook": False,
        "delete-account": True,
        "create-checkout-session": True,
        "create-portal-session": True,
        "change-subscription-plan": True,
        "cancel-subscription": True,
        "list-invoices": True,
        "sync-video-scenarios": True,
        "get-learn-video-url": True,
        "sync-learn-videos": True,
    }
    actual = {name: functions.get(name, {}).get("verify_jwt") for name in expected}
    if actual != expected:
        fail(f"unexpected Edge Function JWT configuration: {actual!r}")

    function_root = ROOT / "backend" / "supabase" / "functions"
    expected_versions = {
        "https://esm.sh/@supabase/supabase-js": "2.110.8",
        "https://esm.sh/stripe": "17.7.0",
    }
    failures: list[str] = []
    occurrences = {dependency: 0 for dependency in expected_versions}
    for source in sorted(function_root.rglob("*.ts")):
        text = source.read_text(encoding="utf-8")
        for dependency, version in expected_versions.items():
            pattern = re.compile(re.escape(dependency) + r"(?:@([^?'\"\s]+))?")
            for match in pattern.finditer(text):
                occurrences[dependency] += 1
                if match.group(1) != version:
                    failures.append(f"{source.relative_to(ROOT)} has unpinned {dependency}")
    if failures or any(count == 0 for count in occurrences.values()):
        fail("Edge Function dependencies are not fully pinned: " + "; ".join(failures))

    migration = (ROOT / "backend" / "supabase" / "migrations" / "20260722_0050_launch_security_hardening.sql").read_text(encoding="utf-8")
    destructive_lines = [
        " ".join(line.strip().lower().split())
        for line in migration.splitlines()
        if re.match(r"(?i)^\s*(drop\s+table|truncate|delete\s+from)\b", line)
    ]
    # The sole DELETE is a narrowly-scoped runtime trigger: when the second
    # participant deletes their profile it removes the now-ownerless
    # conversation so ON DELETE SET NULL cannot violate the one-survivor check.
    # It never runs while this migration is applied and it cannot delete a
    # conversation that still belongs to another profile.
    allowed_runtime_delete = "delete from public.conversations conversation_entry"
    unexpected_destructive_lines = [
        line for line in destructive_lines if line != allowed_runtime_delete
    ]
    if unexpected_destructive_lines or destructive_lines.count(allowed_runtime_delete) != 1:
        fail(
            "the isolated launch migration contains an unexpected destructive "
            f"statement: {unexpected_destructive_lines!r}"
        )
    safe_last_profile_trigger = re.compile(
        r"create\s+or\s+replace\s+function\s+public\.delete_last_profile_conversations\(\)"
        r".*?delete\s+from\s+public\.conversations\s+conversation_entry"
        r".*?conversation_entry\.user_a_id\s*=\s*old\.id"
        r".*?conversation_entry\.user_b_id\s+is\s+null"
        r".*?conversation_entry\.user_b_id\s*=\s*old\.id"
        r".*?conversation_entry\.user_a_id\s+is\s+null"
        r".*?create\s+trigger\s+on_profile_delete_last_conversations"
        r"\s+before\s+delete\s+on\s+public\.profiles",
        re.IGNORECASE | re.DOTALL,
    )
    if not safe_last_profile_trigger.search(migration):
        fail("the last-profile conversation cleanup trigger is not narrowly scoped")
    for required_fragment in (
        "revoke all on table public.profiles",
        "update storage.buckets",
        "get_social_feed_unchecked_20260722",
        "get_attempt_topic_breakdown_unchecked_20260722",
        "claim_account_deletion_job",
        "conversations_has_remaining_user",
    ):
        if required_fragment not in migration:
            fail(f"launch migration is missing {required_fragment!r}")

    security_migration_name = "20260722_0050_launch_security_hardening.sql"
    abuse_migration_name = "20260723000000_launch_abuse_controls.sql"
    if not security_migration_name < abuse_migration_name:
        fail("0050 must sort before the dependent abuse-controls migration")
    security_version = int(security_migration_name.split("_", maxsplit=1)[0])
    abuse_version = int(abuse_migration_name.split("_", maxsplit=1)[0])
    if not security_version < abuse_version:
        fail("abuse-controls migration must use a unique, monotonic Supabase version")

    abuse_migration = (
        ROOT / "backend" / "supabase" / "migrations" / abuse_migration_name
    ).read_text(encoding="utf-8")
    abuse_destructive_lines = [
        " ".join(line.strip().lower().split())
        for line in abuse_migration.splitlines()
        if re.match(r"(?i)^\s*(drop\s+table|truncate|delete\s+from|update\s+public\.|update\s+storage\.)\b", line)
    ]
    if abuse_destructive_lines:
        fail(
            "the abuse-controls migration must not rewrite or remove existing data: "
            f"{abuse_destructive_lines!r}"
        )
    if not abuse_migration.lstrip().lower().startswith("-- reflab launch abuse controls"):
        fail("the abuse-controls migration header is missing")
    if "apply only after 20260722_0050_launch_security_hardening.sql" not in abuse_migration.lower():
        fail("the abuse-controls migration does not pin its dependency on 0050")
    for required_fragment in (
        "alter table public.question_bank enable row level security",
        "revoke all on table public.question_bank from public, anon, authenticated",
        "revoke_unused_public_rpcs",
        "reflab_private.current_user_has_deletion_job()",
        "create table reflab_private.abuse_rate_limits",
        "enforce_social_write_rate_limit",
        "create trigger enforce_posts_launch_rate_limit",
        "create trigger enforce_post_comments_launch_rate_limit",
        "create trigger enforce_messages_launch_rate_limit",
        "create trigger enforce_post_likes_launch_rate_limit",
        "create trigger enforce_comment_likes_launch_rate_limit",
        "create trigger enforce_user_follows_launch_rate_limit",
        "create trigger enforce_post_saves_launch_rate_limit",
        "create trigger enforce_user_blocks_launch_rate_limit",
    ):
        if required_fragment not in abuse_migration:
            fail(f"abuse-controls migration is missing {required_fragment!r}")
    for forbidden_fragment in (
        "storage.objects",
        "enforce_user_media_upload_limits",
        "reflab_storage_objects_bucket_owner_idx",
    ):
        if forbidden_fragment in abuse_migration:
            fail(
                "abuse-controls migration modifies unsupported Storage internals: "
                f"{forbidden_fragment!r}"
            )


def validate_workflows() -> None:
    workflow_dir = ROOT / ".github" / "workflows"
    action_pattern = re.compile(r"^\s*uses:\s*([^@\s]+)@([^\s#]+)", re.MULTILINE)
    sha_pattern = re.compile(r"^[0-9a-f]{40}$")
    failures: list[str] = []
    for workflow in sorted(workflow_dir.glob("*.yml")):
        text = workflow.read_text(encoding="utf-8")
        for action, reference in action_pattern.findall(text):
            if not action.startswith("./") and not sha_pattern.fullmatch(reference):
                failures.append(f"{workflow.relative_to(ROOT)}: {action}@{reference}")
    if failures:
        fail("actions must be pinned to full commit SHAs: " + "; ".join(failures))

    frontend_ci = (workflow_dir / "frontend-ci.yml").read_text(encoding="utf-8")
    for fragment in (
        "VITE_SUPABASE_URL: https://ci-backend-disabled.invalid",
        "VITE_SUPABASE_ANON_KEY: ci-backend-disabled",
        'VITE_PAID_PLANS_ENABLED: "false"',
        'VITE_GOOGLE_OAUTH_ENABLED: "false"',
        'VITE_CAPTCHA_ENABLED: "false"',
    ):
        if fragment not in frontend_ci:
            fail(f"frontend CI is missing fail-closed value {fragment!r}")

    playwright_config = (ROOT / "apps" / "frontend" / "playwright.config.ts").read_text(
        encoding="utf-8"
    )
    for fragment in (
        'VITE_GOOGLE_OAUTH_ENABLED: "false"',
        'VITE_CAPTCHA_ENABLED: "false"',
    ):
        if fragment not in playwright_config:
            fail(f"Playwright is missing fail-closed value {fragment!r}")

    backend_ci = (workflow_dir / "backend-static-ci.yml").read_text(encoding="utf-8")
    for fragment in (
        "node .github/scripts/test_abuse_controls.mjs",
        "node .github/scripts/test_abuse_controls_concurrency.mjs",
        "postgres:17.10-bookworm@sha256:",
        "./scripts/launch/Test-LaunchTooling.ps1",
    ):
        if fragment not in backend_ci:
            fail(f"backend CI is missing launch gate {fragment!r}")


def inspect_launch_content() -> dict[str, object]:
    """Return mechanical launch blockers without failing ordinary CI."""

    frontend_source = ROOT / "apps" / "frontend" / "src"
    policy_files = (
        frontend_source / "features" / "policies" / "components" / "PrivacyPolicyTab.tsx",
        frontend_source / "features" / "policies" / "components" / "TermsOfServiceTab.tsx",
    )
    policy_text = "\n".join(path.read_text(encoding="utf-8") for path in policy_files)
    source_text = "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted(frontend_source.rglob("*"))
        if path.suffix in {".ts", ".tsx"}
    )
    signup = (
        frontend_source / "features" / "auth" / "components" / "SignupForm.tsx"
    ).read_text(encoding="utf-8")

    checks = {
        "policyTextContainsNoPlaceholderMarker": not bool(
            re.search(r"(?i)\bplaceholder\b", policy_text)
        ),
        "temporaryPrivacyAddressAbsent": "privacy@reflab.com" not in source_text.lower(),
        "signupTermsLinkPresent": bool(
            re.search(r"<(?:Link|a)\b[^>]*(?:to|href)\s*=\s*[\"']/terms[\"']", signup)
        ),
        "signupPrivacyLinkPresent": bool(
            re.search(r"<(?:Link|a)\b[^>]*(?:to|href)\s*=\s*[\"']/privacy[\"']", signup)
        ),
    }
    findings = [name for name, passed in checks.items() if not passed]
    return {"schemaVersion": 1, "passed": not findings, "checks": checks, "findings": findings}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--launch-content-json", action="store_true")
    args = parser.parse_args()

    launch_content = inspect_launch_content()
    if args.launch_content_json:
        print(json.dumps(launch_content, sort_keys=True))
        return

    validate_netlify()
    validate_frontend()
    validate_supabase()
    validate_workflows()
    if not launch_content["passed"]:
        print(
            "Launch-only content blockers (preflight remains NO-GO): "
            + ", ".join(launch_content["findings"]),
            file=sys.stderr,
        )
    print("Release configuration, isolation, headers and dependency pins are valid.")


if __name__ == "__main__":
    main()
