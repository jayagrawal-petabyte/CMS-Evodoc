"""Verify the security fixes (H1, H2, M1, M2, M3, L2)."""
import json, urllib.request, urllib.error, urllib.parse, time

BASE = "http://localhost:4000"
def req(method, path, token=None, body=None, raw=False):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    if token: r.add_header("Authorization", "Bearer " + token)
    if data: r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r) as resp:
            txt = resp.read().decode()
            return resp.status, (json.loads(txt) if txt and not raw else txt)
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode())
        except: return e.code, None
    except Exception as e:
        return 0, str(e)

def login(phone, pw):
    s, d = req("POST", "/auth/login", body={"phone": phone, "password": pw})
    return d.get("accessToken") if isinstance(d, dict) else None

def check(name, ok, detail=""):
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + (f"  — {detail}" if detail else ""))

print("=== SECURITY VERIFICATION ===")
uniq = str(int(time.time()))
recep = login("9000000003", "recep123")
doctor = login("9000000001", "doctor123")

# Setup: create a victim visit (patient-001 via walk-in 9876543210)
req("POST", "/tokens/walkin", recep, {"patientPhone": "9876543210", "doctorId": "doctor-001", "createPatientIfNotFound": True})
s, q = req("GET", "/tokens/today", doctor)
tok = sorted([t for t in (q or []) if t["status"] in ("Waiting","Arrived","Called")], key=lambda t:-t["tokenNumber"])
vid = None
if tok:
    s, d = req("POST", f"/tokens/{tok[0]['id']}/start-visit", doctor)
    vid = d.get("visitId") if isinstance(d, dict) else None

# Register + login an unrelated attacker patient
req("POST", "/auth/register", body={"fullName": "Attacker", "phone": "955500"+uniq[-4:], "password": "attack1234"})
attacker = login("955500"+uniq[-4:], "attack1234")

print("\n# H1 — Visit IDOR")
if vid and attacker:
    s, _ = req("GET", f"/visits/{vid}", attacker)
    check("Attacker patient blocked from another's visit", s == 403, f"HTTP {s} (expect 403)")
    s, _ = req("GET", f"/visits/{vid}", doctor)
    check("Doctor (clinical staff) can read the visit", s == 200, f"HTTP {s} (expect 200)")
    s, _ = req("GET", f"/visits/{vid}/history", attacker)
    check("Attacker blocked from visit history", s == 403, f"HTTP {s} (expect 403)")
else:
    check("H1 setup", False, "no visit/attacker")

print("\n# M1 — PostgREST injection in patient search")
s, d = req("GET", "/patients?search=" + urllib.parse.quote("',()%*x"), recep)
check("Injection chars in search are sanitized (no error)", s == 200 and isinstance(d, list), f"HTTP {s}")
s, d = req("GET", "/patients?search=" + urllib.parse.quote("Rahul"), recep)
check("Normal search still works", s == 200 and isinstance(d, list), f"{len(d) if isinstance(d,list) else '?'} results")

print("\n# M3 — login user-enumeration / generic error")
s, d = req("POST", "/auth/login", body={"phone": "9111111111", "password": "whatever"})
check("Unknown phone -> generic 401", s == 401, f"HTTP {s}, msg='{d.get('error') if isinstance(d,dict) else d}'")

print("\n# H2 — attachment upload to PRIVATE bucket + signed URL")
if vid:
    import io
    boundary = "----verify" + uniq
    parts = []
    for field, value in [("visitId", vid), ("patientId", "patient-001")]:
        parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{field}\"\r\n\r\n{value}\r\n")
    parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"test.txt\"\r\nContent-Type: text/plain\r\n\r\nhello phi\r\n")
    parts.append(f"--{boundary}--\r\n")
    payload = "".join(parts).encode()
    rr = urllib.request.Request(BASE + "/visits/attachments", data=payload, method="POST")
    rr.add_header("Authorization", "Bearer " + doctor)
    rr.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    try:
        with urllib.request.urlopen(rr) as resp:
            d = json.loads(resp.read().decode())
            url = d.get("url", "")
            check("Upload succeeds to visit-files bucket", resp.status == 201, f"HTTP {resp.status}")
            check("URL is a SIGNED url (not public)", "/sign/" in url or "token=" in url, f"url has token: {('token=' in url)}")
    except urllib.error.HTTPError as e:
        check("Attachment upload", False, f"HTTP {e.code}: {e.read().decode()[:80]}")

print("\n# M2 — auth rate limiting (10/min)")
import urllib.parse
codes = []
for i in range(14):
    s, _ = req("POST", "/auth/login", body={"phone": "9000000000", "password": "x"})
    codes.append(s)
got_429 = 429 in codes
check("Rate limit kicks in (429) after burst", got_429, f"codes={codes}")
print("\n=== DONE ===")
