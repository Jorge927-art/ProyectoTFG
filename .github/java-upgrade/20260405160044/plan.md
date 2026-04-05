# CVE Fix Plan (20260405160044)

- **Project**: ProyectoTFG (gestion-cursos-backend)
- **Generated**: 2026-04-05
- **Total CVEs found**: 29 across 6 dependencies
- **Java Version**: 21.0.10 LTS
- **Spring Boot Version**: 3.2.5
- **Maven Version**: 3.9.12

## Vulnerable Dependencies

### 1. `org.springframework.security:spring-security-web:6.2.4` — 6.2.4 → 6.2.7 ✅ Upgrade

**CRITICAL PRIORITY** — 2 CRITICAL CVEs affecting authorization and HTTP headers

| Severity | CVE | Description |
|----------|-----|-------------|
| CRITICAL | [CVE-2024-38821](https://github.com/advisories/GHSA-c4q5-6c82-3qpw) | Authorization Bypass of Static Resources in WebFlux Applications |
| CRITICAL | [CVE-2026-22732](https://github.com/advisories/GHSA-mf92-479x-3373) | HTTP Headers Not Written Under Some Conditions |

---

### 2. `org.apache.tomcat.embed:tomcat-embed-core:10.1.20` — 10.1.20 → 10.1.34 ✅ Upgrade

**CRITICAL PRIORITY** — 1 CRITICAL RCE + 8 HIGH severity DoS/RCE vulnerabilities

| Severity | CVE | Description |
|----------|-----|-------------|
| CRITICAL | [CVE-2025-24813](https://github.com/advisories/GHSA-83qj-6fr2-vhqg) | Potential RCE and/or Information Disclosure via Partial PUT (write-enabled Default Servlet) |
| HIGH | [CVE-2024-34750](https://github.com/advisories/GHSA-wm9w-rjj3-j356) | Excessive HTTP/2 Headers Cause Infinite Timeout (DoS) |
| HIGH | [CVE-2024-50379](https://github.com/advisories/GHSA-5j33-cvvr-w245) | TOCTOU Race Condition in JSP Compilation (RCE on case-insensitive FS) |
| HIGH | [CVE-2024-56337](https://github.com/advisories/GHSA-27hp-xhwr-wr2m) | TOCTOU Incomplete Mitigation for CVE-2024-50379 |
| HIGH | [CVE-2025-48988](https://github.com/advisories/GHSA-h3gc-qfqq-6h8f) | DoS via Unrestricted Multipart Upload Upload |
| HIGH | [CVE-2025-52520](https://github.com/advisories/GHSA-wr62-c79q-cv37) | Integer Overflow in Multipart Upload Size Limits (DoS) |
| HIGH | [CVE-2025-53506](https://github.com/advisories/GHSA-25xr-qj8w-c4vf) | DoS via Excessive HTTP/2 Streams |
| HIGH | [CVE-2025-48989](https://github.com/advisories/GHSA-gqp3-2cvr-x8m3) | Made You Reset Attack (Improper Resource Release) |
| HIGH | [CVE-2026-24734](https://github.com/advisories/GHSA-mgp5-rv84-w37q) | OCSP Response Verification Bypass (Certificate Revocation Check) |
| MEDIUM | [CVE-2025-31650](https://github.com/advisories/GHSA-3p2h-wqq4-wf4h) | Invalid HTTP Priority Header Memory Leak (DoS) |
| MEDIUM | [CVE-2025-49125](https://github.com/advisories/GHSA-wc4r-xq3c-5cf3) | Security Constraint Bypass for PreResources/PostResources |
| MEDIUM | [CVE-2025-49124](https://github.com/advisories/GHSA-42wg-hm62-jcwg) | Untrusted Search Path in Windows Installer |
| MEDIUM | [CVE-2025-66614](https://github.com/advisories/GHSA-fpj8-gq4v-p354) | Client Certificate Verification Bypass (Multi-vhost Configuration) |
| LOW | [CVE-2025-31651](https://github.com/advisories/GHSA-ff77-26x5-69cr) | Rewrite Rule Bypass for Security Constraints |
| LOW | [CVE-2025-55752](https://github.com/advisories/GHSA-wmwf-9ccg-fff5) | Relative Path Traversal via Rewrite Rules |
| LOW | [CVE-2025-61795](https://github.com/advisories/GHSA-hgrr-935x-pq79) | Improper Cleanup of Temporary Multipart Files (DoS) |
| LOW | [CVE-2025-55754](https://github.com/advisories/GHSA-vfww-5hm6-hx2j) | ANSI Escape Sequence Injection in Logs |
| LOW | [CVE-2026-24733](https://github.com/advisories/GHSA-qq5r-98hh-rxc9) | HTTP/0.9 Security Constraint Bypass |

---

### 3. `org.springframework.security:spring-security-crypto:6.2.4` — 6.2.4 → 6.2.7 ✅ Upgrade

**HIGH PRIORITY** — BCrypt password length validation bypass

| Severity | CVE | Description |
|----------|-----|-------------|
| HIGH | [CVE-2025-22228](https://github.com/advisories/GHSA-mg83-c7gq-rv5c) | Does Not Enforce Password Length (>72 chars accepted as valid) |

---

### 4. `org.springframework:spring-webmvc:6.1.6` — 6.1.6 → 6.1.25 ✅ Upgrade

**HIGH PRIORITY** — Path traversal in static resource serving

| Severity | CVE | Description |
|----------|-----|-------------|
| HIGH | [CVE-2024-38816](https://github.com/advisories/GHSA-cx7f-g6mp-7hqm) | Path Traversal in WebMvc.fn with FileSystemResource |
| HIGH | [CVE-2024-38819](https://github.com/advisories/GHSA-g5vr-rgqm-vf78) | Path Traversal in Functional Web Frameworks |
| MEDIUM | [CVE-2025-41242](https://github.com/advisories/GHSA-r936-gwx5-v52f) | MVC Path Traversal on Non-Compliant Servlet Containers |
| MEDIUM | [CVE-2026-22737](https://github.com/advisories/GHSA-4773-3jfm-qmx3) | Improper Path Limitation with Script Template Views |
| LOW | [CVE-2026-22735](https://github.com/advisories/GHSA-6hcq-hmm3-jj3c) | Server-Sent Event Stream Corruption |

---

### 5. `net.minidev:json-smart:2.5.1` — 2.5.1 → 2.6.0 ✅ Upgrade

**MEDIUM PRIORITY** — Stack exhaustion DoS in JSON parsing

| Severity | CVE | Description |
|----------|-----|-------------|
| HIGH | [CVE-2024-57699](https://github.com/advisories/GHSA-pq2g-wx69-c263) | Stack Exhaustion via Deeply Nested JSON (DoS) |

---

### 6. `org.assertj:assertj-core:3.24.2` — 3.24.2 → 3.27.7 ✅ Upgrade

**LOW PRIORITY** — XXE in test assertions (low risk, test-only dependency)

| Severity | CVE | Description |
|----------|-----|-------------|
| HIGH | [CVE-2026-24400](https://github.com/advisories/GHSA-rqfh-9r24-8c9r) | XXE in isXmlEqualTo() Test Assertion |

---

## Options

- **Minimum severity to fix**: ✅ **ALL CVEs approved** (29 total) — All CRITICAL, HIGH, MEDIUM, and LOW severity vulnerabilities
- **Recommended approach**: Fix ALL CVEs (29 total) — Spring Security CRITICAL issues require immediate patching
- **Working branch**: `appmod/cve-fix-20260405160044`
- **Affected dependencies**: 6 direct dependencies (spring-security-web, tomcat-embed-core, spring-security-crypto, spring-webmvc, json-smart, assertj-core)
- **Expected Spring Boot compatibility**: Full compatibility — all dependency upgrades maintain Spring Boot 3.2.5 BOM compliance

## Dependency Upgrade Strategy

All upgrades maintain Spring Boot 3.2.5 compatibility:

| Dependency | Current | Recommended | Type |
|------------|---------|-------------|------|
| `spring-security-web` | 6.2.4 | 6.2.7 | Spring Security (managed by BOM) |
| `spring-security-crypto` | 6.2.4 | 6.2.7 | Spring Security (managed by BOM) |
| `spring-webmvc` | 6.1.6 | 6.1.25 | Spring Framework (managed by BOM) |
| `tomcat-embed-core` | 10.1.20 | 10.1.34 | Tomcat (managed by Spring Boot) |
| `json-smart` | 2.5.1 | 2.6.0 | Transitive via json-path; explicit version override |
| `assertj-core` | 3.24.2 | 3.27.7 | Test dependency |

## Build Impact Assessment

✅ **Low risk** — All upgrades are patch/minor versions within the same Spring Boot 3.2.5 compatibility range. No API changes expected.

## Next Steps

1. **Review the CVE details** above
2. **Select minimum severity to fix**: CRITICAL only | HIGH and above | MEDIUM and above | **ALL (recommended)**
3. **Approve the fix plan** — this document will be updated with your selection
4. **Execute fixes** — dependency versions will be updated in `pom.xml`
5. **Verify build** — `mvn clean test-compile` will be run to ensure no regressions
6. **Re-scan CVEs** — final validation that all selected CVEs are resolved
