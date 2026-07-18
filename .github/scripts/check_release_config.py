"""Validate security-sensitive release configuration without network access."""

from __future__ import annotations

import json
import re
import tomllib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def fail(message: str) -> None:
    raise SystemExit(f"Release configuration validation failed: {message}")


def validate_netlify() -> None:
    config = tomllib.loads((ROOT / "netlify.toml").read_text(encoding="utf-8"))

    expected_build = {
        "base": "apps/frontend",
        "command": "npm run build",
        "publish": "dist",
    }
    build_config = config.get("build", {})
    actual_build = {key: build_config.get(key) for key in expected_build}
    if actual_build != expected_build:
        fail(f"netlify.toml [build] must include {expected_build!r}")
    if build_config.get("environment", {}).get("NODE_VERSION") != "22":
        fail("netlify.toml must pin NODE_VERSION to 22")

    redirects = config.get("redirects", [])
    if not redirects:
        fail("netlify.toml has no redirect rules")

    catch_all = {"from": "/*", "to": "/404.html", "status": 404}
    if redirects[-1] != catch_all:
        fail("the final redirect must be the custom 404 catch-all")

    required_rewrites = {
        "/app/*": "/private.html",
        "/app": "/private.html",
        "/admin/*": "/private.html",
        "/admin": "/private.html",
        "/auth/*": "/private.html",
        "/legal/*": "/private.html",
        "/reset-password": "/private.html",
    }
    actual_rewrites = {
        rule.get("from"): rule.get("to")
        for rule in redirects[:-1]
        if rule.get("status") == 200
    }
    missing = {
        source: target
        for source, target in required_rewrites.items()
        if actual_rewrites.get(source) != target
    }
    if missing:
        fail(f"missing private application rewrites: {missing!r}")

    header_rules = config.get("headers", [])
    if not header_rules or header_rules[-1].get("for") != "/*":
        fail("the global header rule must be last so it cannot shadow specific rules")
    headers = {entry.get("for"): entry.get("values", {}) for entry in header_rules}
    global_headers = headers.get("/*", {})
    required_security_headers = {
        "Content-Security-Policy",
        "Cross-Origin-Opener-Policy",
        "Cross-Origin-Resource-Policy",
        "Permissions-Policy",
        "Referrer-Policy",
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "X-Frame-Options",
        "X-Permitted-Cross-Domain-Policies",
    }
    absent = sorted(required_security_headers - global_headers.keys())
    if absent:
        fail(f"missing global security headers: {', '.join(absent)}")
    csp = global_headers["Content-Security-Policy"]
    if "fonts.googleapis.com" in csp or "fonts.gstatic.com" in csp:
        fail("the launch bundle must self-host fonts instead of contacting Google Fonts")
    if re.search(r"(?:img-src|media-src)[^;]*\shttps:\s", csp):
        fail("image and media CSP sources must be host-scoped, not all of HTTPS")
    asset_headers = headers.get("/assets/*", {})
    if asset_headers.get("Cache-Control") != "public, max-age=31536000, immutable":
        fail("fingerprinted assets must use the immutable cache policy")
    for name in ("Cross-Origin-Resource-Policy", "Strict-Transport-Security", "X-Content-Type-Options"):
        if name not in asset_headers:
            fail(f"the asset rule must retain security header {name}")


def validate_frontend_build() -> None:
    package = json.loads((ROOT / "apps" / "frontend" / "package.json").read_text(encoding="utf-8"))
    build = package.get("scripts", {}).get("build", "")
    for command in ("tsc -b", "vite build", "generate-static-shells.mjs", "verify-static-shells.mjs"):
        if command not in build:
            fail(f"frontend build is missing {command!r}")

    scripts = package.get("scripts", {})
    if scripts.get("test") != "vitest run":
        fail("frontend package must expose the deterministic Vitest gate")
    if scripts.get("test:e2e") != "playwright test":
        fail("frontend package must expose the Playwright smoke gate")

    function_tests = list((ROOT / "backend" / "supabase" / "functions").rglob("*_test.ts"))
    if not function_tests:
        fail("at least one Edge Function unit-test file is required")

    styles = (ROOT / "apps" / "frontend" / "src" / "styles" / "globals.css").read_text(encoding="utf-8")
    if '@fontsource-variable/inter/wght.css' not in styles or "fonts.googleapis.com" in styles:
        fail("Inter must be bundled locally through @fontsource-variable/inter")
    tokens = (ROOT / "apps" / "frontend" / "src" / "styles" / "tokens.css").read_text(encoding="utf-8")
    if '"Inter Variable"' not in tokens:
        fail("the typography token must reference the bundled Inter Variable family")


def validate_action_pins() -> None:
    workflow_dir = ROOT / ".github" / "workflows"
    action_pattern = re.compile(r"^\s*uses:\s*([^@\s]+)@([^\s#]+)", re.MULTILINE)
    sha_pattern = re.compile(r"^[0-9a-f]{40}$")
    failures: list[str] = []

    for workflow in sorted(workflow_dir.glob("*.yml")):
        text = workflow.read_text(encoding="utf-8")
        for action, reference in action_pattern.findall(text):
            if action.startswith("./") or action.startswith("docker://"):
                continue
            if not sha_pattern.fullmatch(reference):
                failures.append(f"{workflow.relative_to(ROOT)}: {action}@{reference}")

    if failures:
        fail("third-party actions must be pinned to full commit SHAs:\n" + "\n".join(failures))


def validate_edge_function_dependency_pins() -> None:
    function_root = ROOT / "backend" / "supabase" / "functions"
    expected_versions = {
        "https://esm.sh/@supabase/supabase-js": "2.110.7",
        "https://esm.sh/stripe": "17.7.0",
    }
    failures: list[str] = []
    occurrences = {dependency: 0 for dependency in expected_versions}

    for source in sorted(function_root.rglob("*.ts")):
        text = source.read_text(encoding="utf-8")
        for dependency, expected_version in expected_versions.items():
            pattern = re.compile(re.escape(dependency) + r"(?:@([^?'\"\s]+))?")
            for match in pattern.finditer(text):
                occurrences[dependency] += 1
                actual_version = match.group(1)
                if actual_version != expected_version:
                    rendered_version = actual_version or "<missing>"
                    failures.append(
                        f"{source.relative_to(ROOT)}: {dependency}@{rendered_version} "
                        f"must be pinned to {expected_version}"
                    )

    for dependency, count in occurrences.items():
        if count == 0:
            failures.append(f"no audited import of {dependency} was found")

    if failures:
        fail("Edge Function dependencies must use the audited exact versions:\n" + "\n".join(failures))


def main() -> None:
    validate_netlify()
    validate_frontend_build()
    validate_action_pins()
    validate_edge_function_dependency_pins()
    print("Release configuration, redirects, headers, action pins and Edge Function dependencies are valid.")


if __name__ == "__main__":
    main()
