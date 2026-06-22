"""Audit EVERY backend endpoint: correct status, auth, and role enforcement."""
import json, urllib.request, urllib.error, time
from datetime import datetime, timedelta, timezone

BASE = "http://localhost:4000"
rows = []

def req(method, path, token=None, body=None, origin=None):
    time.sleep(0.35)  # pace requests so Supabase doesn't throttle the burst
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    if token: r.add_header("Authorization", "Bearer " + token)
    if data: r.add_header("Content-Type", "application/json")
    if origin: r.add_header("Origin", origin)
    try:
        with urllib.request.urlopen(r, timeout=20) as resp:
            t = resp.read().decode()
            return resp.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try: return e.code, json.loads(t)
        except: return e.code, t
    except Exception as e:
        return 0, str(e)

def check(group, name, method, path, got, expect):
    ok = got in (expect if isinstance(expect, (list, tuple)) else [expect])
    rows.append((group, f"{method} {path}", got, expect if isinstance(expect, int) else "/".join(map(str, expect)), ok, name))

def login(phone, pw):
    s, d = req("POST", "/auth/login", body={"phone": phone, "password": pw})
    return d.get("accessToken") if isinstance(d, dict) else None

uniq = str(int(time.time()))
recep = login("9000000003", "recep123")
doctor = login("9000000001", "doctor123")
patient = login("9876543210", "patient123")
_specs = req("GET", "/specializations", recep)[1]
spec = _specs[0].get("id") if isinstance(_specs, list) and _specs else None
pid = "patient-001"

# ---- set up a token + visit chain for :id endpoints ----
req("POST", "/tokens/walkin", recep, {"patientPhone": "9876543210", "doctorId": "doctor-001", "createPatientIfNotFound": True})
q = req("GET", "/tokens/today", doctor)[1]
q = q if isinstance(q, list) else []
tok = next((t for t in q if isinstance(t, dict) and t.get("status") in ("Waiting", "Arrived", "Called")), None)
tok_id = tok["id"] if tok else None
vid = None
if tok_id:
    sv = req("POST", f"/tokens/{tok_id}/start-visit", doctor)[1]
    vid = sv.get("visitId") if isinstance(sv, dict) else None
_appt = req("GET", "/appointments", patient)[1]
appt_id = _appt[0].get("id") if isinstance(_appt, list) and _appt else None

# ============ HEALTH / CONNECTION ============
check("Health", "health + DB", "GET", "/health", *([req("GET", "/health")[0]] + [200]))

# ============ AUTH ============
check("Auth", "login (valid)", "POST", "/auth/login", req("POST", "/auth/login", body={"phone": "9876543210", "password": "patient123"})[0], 200)
check("Auth", "login (bad)", "POST", "/auth/login", req("POST", "/auth/login", body={"phone": "0000000000", "password": "x123456"})[0], 401)
check("Auth", "register", "POST", "/auth/register", req("POST", "/auth/register", body={"fullName": "Chk " + uniq, "phone": "9" + uniq[-9:], "password": "test1234"})[0], [200, 201, 409])
check("Auth", "me", "GET", "/auth/me", req("GET", "/auth/me", patient)[0], 200)
check("Auth", "me (no token=401)", "GET", "/auth/me", req("GET", "/auth/me")[0], 401)
check("Auth", "refresh (no cookie)", "POST", "/auth/refresh", req("POST", "/auth/refresh")[0], 401)
check("Auth", "logout", "POST", "/auth/logout", req("POST", "/auth/logout")[0], 200)

# ============ DOCTORS / SPECIALIZATIONS ============
check("Doctors", "list", "GET", "/doctors", req("GET", "/doctors?active=true")[0], 200)
check("Doctors", "by id", "GET", "/doctors/:id", req("GET", "/doctors/doctor-001")[0], 200)
check("Doctors", "schedule", "GET", "/doctors/:id/schedule", req("GET", "/doctors/doctor-001/schedule", recep)[0], 200)
check("Doctors", "update schedule", "PUT", "/doctors/:id/schedule", req("PUT", "/doctors/doctor-001/schedule", recep, {"schedules": [{"dayOfWeek": 1, "startTime": "09:00", "endTime": "13:00", "slotDurationMinutes": 15, "isActive": True}]})[0], 200)
nd = req("POST", "/doctors", recep, {"fullName": "Chk Doc " + uniq, "phone": "8" + uniq[-9:], "specializationId": spec, "password": "test123"})[1]
ndid = nd.get("id") if isinstance(nd, dict) else None
check("Doctors", "create", "POST", "/doctors", 201 if ndid else 500, 201)
check("Doctors", "update", "PUT", "/doctors/:id", req("PUT", f"/doctors/{ndid}", recep, {"qualification": "MD"})[0] if ndid else 0, 200)
check("Doctors", "specializations", "GET", "/specializations", req("GET", "/specializations")[0], 200)
check("Doctors", "create spec", "POST", "/specializations", req("POST", "/specializations", recep, {"name": "Chk " + uniq})[0], 201)
check("Doctors", "create (role guard)", "POST", "/doctors", req("POST", "/doctors", patient, {"fullName": "x", "phone": "1", "specializationId": spec, "password": "y"})[0], 403)

# ============ PATIENTS ============
check("Patients", "list", "GET", "/patients", req("GET", "/patients", recep)[0], 200)
check("Patients", "search", "GET", "/patients?search", req("GET", "/patients?search=9876", recep)[0], 200)
check("Patients", "lookup", "GET", "/patients/lookup", req("GET", "/patients/lookup?phone=9876543210", recep)[0], 200)
check("Patients", "by id (own)", "GET", "/patients/:id", req("GET", f"/patients/{pid}", patient)[0], 200)
check("Patients", "update", "PUT", "/patients/:id", req("PUT", f"/patients/{pid}", patient, {"bloodGroup": "O+"})[0], 200)
check("Patients", "allergies", "GET", "/patients/:id/allergies", req("GET", f"/patients/{pid}/allergies", doctor)[0], 200)
al = req("POST", f"/patients/{pid}/allergies", doctor, {"allergen": "Chk", "severity": "Mild"})[1]
check("Patients", "add allergy", "POST", "/patients/:id/allergies", 201 if isinstance(al, dict) and al.get("id") else 500, 201)
check("Patients", "del allergy", "DELETE", "/patients/:id/allergies/:aid", req("DELETE", f"/patients/{pid}/allergies/{al.get('id')}", doctor)[0] if isinstance(al, dict) else 0, [200, 204])
check("Patients", "medications", "GET", "/patients/:id/medications", req("GET", f"/patients/{pid}/medications", doctor)[0], 200)
md = req("POST", f"/patients/{pid}/medications", doctor, {"drugName": "Chk", "startedAt": "2026-06-01"})[1]
check("Patients", "add medication", "POST", "/patients/:id/medications", 201 if isinstance(md, dict) and md.get("id") else 500, 201)
check("Patients", "del medication", "DELETE", "/patients/:id/medications/:mid", req("DELETE", f"/patients/{pid}/medications/{md.get('id')}", doctor)[0] if isinstance(md, dict) else 0, [200, 204])
check("Patients", "prescriptions", "GET", "/patients/:id/prescriptions", req("GET", f"/patients/{pid}/prescriptions", patient)[0], 200)
check("Patients", "IDOR guard", "GET", "/patients/:id (other)", req("GET", "/patients/doctor-001", patient)[0], [403, 404])

# ============ APPOINTMENTS ============
check("Appts", "list", "GET", "/appointments", req("GET", "/appointments", patient)[0], 200)
check("Appts", "booked", "GET", "/appointments/booked", req("GET", "/appointments/booked?doctorId=doctor-001&date=" + datetime.now().strftime("%Y-%m-%d"))[0], 200)
slot = (datetime.now(timezone.utc) + timedelta(days=2, minutes=int(uniq) % 90000)).replace(second=0, microsecond=0)
bk = req("POST", "/appointments", patient, {"doctorId": "doctor-001", "slotStart": slot.isoformat().replace("+00:00", "Z"), "slotEnd": (slot + timedelta(minutes=15)).isoformat().replace("+00:00", "Z")})
check("Appts", "book", "POST", "/appointments", bk[0], 201)
check("Appts", "double-book 409", "POST", "/appointments", req("POST", "/appointments", patient, {"doctorId": "doctor-001", "slotStart": slot.isoformat().replace("+00:00", "Z"), "slotEnd": (slot + timedelta(minutes=15)).isoformat().replace("+00:00", "Z")})[0], 409)
if appt_id:
    check("Appts", "status update", "PATCH", "/appointments/:id/status", req("PATCH", f"/appointments/{appt_id}/status", recep, {"status": "Cancelled"})[0], 200)

# ============ TOKENS / QUEUE ============
check("Tokens", "today (doctor)", "GET", "/tokens/today", req("GET", "/tokens/today", doctor)[0], 200)
check("Tokens", "queue", "GET", "/tokens/queue", req("GET", "/tokens/queue", recep)[0], 200)
check("Tokens", "my-today", "GET", "/tokens/my-today", req("GET", "/tokens/my-today", patient)[0], [200, 404])
check("Tokens", "walkin", "POST", "/tokens/walkin", req("POST", "/tokens/walkin", recep, {"patientPhone": "9876543210", "doctorId": "doctor-001", "createPatientIfNotFound": True})[0], 201)
if tok_id:
    for verb in ["arrive", "hold", "resume", "skip", "recall"]:
        check("Tokens", verb, "POST", f"/tokens/:id/{verb}", req("POST", f"/tokens/{tok_id}/{verb}", recep)[0], 200)
check("Tokens", "next", "POST", "/tokens/next", req("POST", "/tokens/next", recep)[0], [200, 404])
check("Tokens", "start-visit", "POST", "/tokens/:id/start-visit", 201 if vid else 0, [200, 201])
check("Tokens", "queue (role guard)", "POST", "/tokens/next (patient)", req("POST", "/tokens/next", patient)[0], 403)

# ============ VISITS ============
check("Visits", "today", "GET", "/visits", req("GET", "/visits", doctor)[0], 200)
if vid:
    check("Visits", "by id", "GET", "/visits/:id", req("GET", f"/visits/{vid}", doctor)[0], 200)
    check("Visits", "history", "GET", "/visits/:id/history", req("GET", f"/visits/{vid}/history", doctor)[0], 200)
    check("Visits", "attachments", "GET", "/visits/:id/attachments", req("GET", f"/visits/{vid}/attachments", doctor)[0], 200)

# ============ PRESCRIPTIONS ============
if vid:
    check("Rx", "save draft", "PUT", "/prescriptions/draft", req("PUT", "/prescriptions/draft", doctor, {"visitId": vid, "diagnosis": "Chk", "drugs": [{"id": "d1", "name": "Paracetamol", "dose": "500mg", "frequency": "TID", "duration": "5d", "instructions": ""}]})[0], 200)
    ver = (req("GET", f"/visits/{vid}", doctor)[1] or {}).get("version", 0)
    check("Rx", "finalize+PDF", "POST", "/prescriptions/finalize", req("POST", "/prescriptions/finalize", doctor, {"visitId": vid, "version": ver})[0], [200, 409])

# ============ BILLING ============
check("Billing", "list", "GET", "/invoices", req("GET", "/invoices", recep)[0], 200)
inv = req("POST", "/invoices", recep, {"patientId": pid, "items": [{"description": "Consult", "quantity": 1, "unitPrice": 500}], "discount": 0})[1]
invid = inv.get("id") if isinstance(inv, dict) else None
check("Billing", "create", "POST", "/invoices", 201 if invid else 500, 201)
if invid:
    check("Billing", "by id", "GET", "/invoices/:id", req("GET", f"/invoices/{invid}", recep)[0], 200)
    check("Billing", "pay", "PATCH", "/invoices/:id/pay", req("PATCH", f"/invoices/{invid}/pay", recep, {"paymentMethod": "Cash"})[0], 200)
    check("Billing", "cancel", "DELETE", "/invoices/:id", req("DELETE", f"/invoices/{invid}", recep)[0], [200, 204])

# ============ CLINIC / STATS / AUDIT ============
check("Clinic", "get theme", "GET", "/clinic/theme", req("GET", "/clinic/theme")[0], 200)
check("Clinic", "put theme", "PUT", "/clinic/theme", req("PUT", "/clinic/theme", recep, {"primaryColor": "#2563eb", "secondaryColor": "#7c3aed", "accentColor": "#06b6d4", "fontFamily": "Inter", "clinicDisplayName": "Chk"})[0], 200)
check("Clinic", "dashboard/stats", "GET", "/dashboard/stats", req("GET", "/dashboard/stats", recep)[0], 200)
check("Stats", "dashboard", "GET", "/stats/dashboard", req("GET", "/stats/dashboard", recep)[0], 200)
check("Stats", "analytics (recep)", "GET", "/stats/analytics", req("GET", "/stats/analytics?days=7", recep)[0], 200)
check("Stats", "analytics (doctor)", "GET", "/stats/analytics", req("GET", "/stats/analytics?days=7", doctor)[0], 200)
check("Audit", "list", "GET", "/audit-logs", req("GET", "/audit-logs", recep)[0], 200)
check("Audit", "create", "POST", "/audit-logs", req("POST", "/audit-logs", recep, {"action": "CHK", "entityType": "Test"})[0], [200, 201])
check("Labs", "list", "GET", "/lab-reports", req("GET", "/lab-reports", patient)[0], 200)

# ============ REPORT ============
out = []
groups = {}
for g, ep, got, exp, ok, name in rows:
    groups.setdefault(g, []).append((ep, got, exp, ok, name))
passed = sum(1 for r in rows if r[4])
out.append("=" * 70)
out.append(f"  ENDPOINT AUDIT — {datetime.now().strftime('%Y-%m-%d %H:%M')} — {passed}/{len(rows)} OK")
out.append("=" * 70)
for g, items in groups.items():
    gp = sum(1 for i in items if i[3])
    out.append(f"\n## {g}  ({gp}/{len(items)})")
    for ep, got, exp, ok, name in items:
        out.append(f"  [{'OK' if ok else 'XX'}] {ep:<34} got={got} exp={exp}  {name}")
fails = [(g, ep, got, exp, name) for g, ep, got, exp, ok, name in rows if not ok]
if fails:
    out.append("\n" + "-" * 70 + "\nFAILURES:")
    for g, ep, got, exp, name in fails:
        out.append(f"  [{g}] {ep}: got {got}, expected {exp} ({name})")
else:
    out.append("\nALL ENDPOINTS OK.")
text = "\n".join(out)
open("endpoint-report.txt", "w", encoding="utf-8").write(text)
print(text)
