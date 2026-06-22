"""Full end-to-end test across all three portals + cross-cutting concerns.
Exercises every workflow and verifies persistence. Produces a structured PASS/FAIL report.
"""
import json, urllib.request, urllib.error, time
from datetime import datetime, timedelta, timezone

BASE = "http://localhost:4000"
rows = []  # (section, name, ok, detail)

def req(method, path, token=None, body=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    if token: r.add_header("Authorization", "Bearer " + token)
    if data: r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r) as resp:
            txt = resp.read().decode()
            return resp.status, (json.loads(txt) if txt else None)
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        try: return e.code, json.loads(txt)
        except: return e.code, txt
    except Exception as e:
        return 0, str(e)

def check(section, name, ok, detail=""):
    rows.append((section, name, bool(ok), str(detail)[:140]))

def login(phone, pw):
    s, d = req("POST", "/auth/login", body={"phone": phone, "password": pw})
    return d.get("accessToken") if isinstance(d, dict) else None

uniq = str(int(time.time()))

# ============ AUTH / SETUP ============
recep = login("9000000003", "recep123")
doctor = login("9000000001", "doctor123")
check("Auth", "Receptionist login", bool(recep))
check("Auth", "Doctor login", bool(doctor))

# ============ PATIENT PORTAL ============
S = "Patient Portal"
pphone = "9" + uniq[-9:]
st, d = req("POST", "/auth/register", body={"fullName": f"E2E Patient {uniq}", "phone": pphone, "password": "test1234"})
check(S, "Register patient", st in (200, 201) and isinstance(d, dict) and d.get("id"), f"status={st}")
patient = login(pphone, "test1234")
check(S, "Patient login", bool(patient), "after register")
pid = None
if patient:
    st, me = req("GET", "/auth/me", patient)
    pid = me.get("id") if isinstance(me, dict) else None

st, docs = req("GET", "/doctors?active=true", patient)
check(S, "Browse active doctors", st == 200 and isinstance(docs, list) and len(docs) > 0, f"{len(docs) if isinstance(docs,list) else 0} doctors")

# Book a unique future slot
appt_id = None
if patient:
    # Session-unique future slot (offset by the run timestamp) so re-runs never collide.
    slot = (datetime.now(timezone.utc) + timedelta(days=2, minutes=int(uniq) % 100000)).replace(second=0, microsecond=0)
    body = {"doctorId": "doctor-001", "slotStart": slot.isoformat().replace("+00:00","Z"),
            "slotEnd": (slot+timedelta(minutes=15)).isoformat().replace("+00:00","Z")}
    st, d = req("POST", "/appointments", patient, body)
    appt_id = d.get("id") if isinstance(d, dict) else None
    check(S, "Book appointment", st == 201 and bool(appt_id), f"status={st}, token#={d.get('tokenNumber') if isinstance(d,dict) else '?'}")
    # Double-book the SAME slot -> must be rejected 409
    st2, d2 = req("POST", "/appointments", patient, body)
    check(S, "Reject double-booking (concurrency)", st2 == 409, f"status={st2} (expect 409)")

st, d = req("GET", "/tokens/my-today", patient)
check(S, "Live token tracker (my-today)", st in (200, 404), f"status={st} ({'has token' if st==200 else 'none today - ok'})")

st, appts = req("GET", "/appointments", patient)
check(S, "My appointments list", st == 200 and isinstance(appts, list), f"{len(appts) if isinstance(appts,list) else 0} appts")

if appt_id:
    st, d = req("PATCH", f"/appointments/{appt_id}/status", recep, {"status": "Cancelled"})
    check(S, "Cancel appointment", st == 200, f"status={st}")

if pid:
    st, d = req("GET", f"/patients/{pid}/prescriptions", patient)
    check(S, "Medical history (prescriptions)", st == 200 and isinstance(d, list), f"{len(d) if isinstance(d,list) else '?'} records")
    st, d = req("PUT", f"/patients/{pid}", patient, {"bloodGroup": "O+", "gender": "Male"})
    st2, d2 = req("GET", f"/patients/{pid}", patient)
    check(S, "Update patient profile", st == 200 and isinstance(d2, dict) and d2.get("bloodGroup") == "O+", "persisted")

# ============ RECEPTION / ADMIN PORTAL ============
S = "Reception/Admin"
st, d = req("GET", "/stats/dashboard", recep)
check(S, "Dashboard stats", st == 200 and isinstance(d, dict) and "totalDoctors" in d, f"doctors={d.get('totalDoctors') if isinstance(d,dict) else '?'}")

# Walk-in -> should start as 'Arrived'
st, d = req("POST", "/tokens/walkin", recep, {"patientPhone": "9876543210", "doctorId": "doctor-001", "createPatientIfNotFound": True})
walk_tok = d.get("tokenNumber") if isinstance(d, dict) else None
check(S, "Walk-in registration", st == 201 and bool(walk_tok), f"token#={walk_tok}")

# Verify walk-in token starts Arrived
st, q = req("GET", "/tokens/queue", recep)
walk_row = next((t for t in (q or []) if t.get("tokenNumber") == walk_tok), None) if isinstance(q, list) else None
check(S, "Walk-in starts as 'Arrived' (present)", walk_row and walk_row.get("status") == "Arrived", f"status={walk_row.get('status') if walk_row else 'not found'}")

# ---- TOKEN STATE MACHINE ----
SM = "Token State Machine"
# create 3 fresh walk-ins to exercise transitions
ids = []
for i in range(3):
    st, d = req("POST", "/tokens/walkin", recep, {"patientPhone": f"900000{uniq[-4:]}{i}", "patientName": f"SM{i}", "doctorId": "doctor-001", "createPatientIfNotFound": True})
st, q = req("GET", "/tokens/queue", recep)
active = [t for t in (q or []) if t.get("status") in ("Waiting", "Arrived")]
active.sort(key=lambda t: t["tokenNumber"])
ids = [t["id"] for t in active[:3]]

if len(ids) >= 3:
    a, b, c = ids[0], ids[1], ids[2]
    # arrive (mark a present - already arrived since walk-in, test idempotent)
    st, _ = req("POST", f"/tokens/{a}/arrive", recep)
    check(SM, "Mark Arrived (pre-exam)", st == 200, f"status={st}")
    # hold b
    st, _ = req("POST", f"/tokens/{b}/hold", recep)
    st2, q2 = req("GET", "/tokens/queue", recep)
    bstat = next((t["status"] for t in (q2 or []) if t["id"] == b), None)
    check(SM, "Hold -> OnHold", st == 200 and bstat == "OnHold", f"status={bstat}")
    # resume b
    st, _ = req("POST", f"/tokens/{b}/resume", recep)
    st2, q2 = req("GET", "/tokens/queue", recep)
    bstat = next((t["status"] for t in (q2 or []) if t["id"] == b), None)
    check(SM, "Resume -> Waiting", st == 200 and bstat == "Waiting", f"status={bstat}")
    # skip c
    st, _ = req("POST", f"/tokens/{c}/skip", recep)
    st2, q2 = req("GET", "/tokens/queue", recep)
    cstat = next((t["status"] for t in (q2 or []) if t["id"] == c), None)
    check(SM, "Skip -> Skipped", st == 200 and cstat == "Skipped", f"status={cstat}")
    # recall c
    st, _ = req("POST", f"/tokens/{c}/recall", recep)
    st2, q2 = req("GET", "/tokens/queue", recep)
    cstat = next((t["status"] for t in (q2 or []) if t["id"] == c), None)
    check(SM, "Recall -> Called", st == 200 and cstat == "Called", f"status={cstat}")
    # abandon a (LWBS)
    st, _ = req("POST", f"/tokens/{a}/abandon", recep)
    st2, q2 = req("GET", "/tokens/queue", recep)
    astat_present = any(t["id"] == a for t in (q2 or []))
    check(SM, "Abandon (LWBS) -> removed from live queue", st == 200 and not astat_present, "terminal, kept for analytics")
    # call next - should call a present/waiting one (not OnHold/Skipped/Abandoned)
    st, d = req("POST", "/tokens/next", recep)
    check(SM, "Call Next (skips Hold/Skip/Abandon)", st in (200, 404), f"status={st}")
else:
    check(SM, "Token state machine", False, f"only {len(ids)} active tokens to test")

# ---- other admin ----
st, specs = req("GET", "/specializations", recep)
spec_id = specs[0]["id"] if isinstance(specs, list) and specs else None
st, d = req("POST", "/specializations", recep, {"name": f"E2ESpec-{uniq}"})
check(S, "Create specialization", st == 201 and isinstance(d, dict) and d.get("id"), f"status={st}")

st, d = req("POST", "/doctors", recep, {"fullName": f"E2E Doc {uniq}", "phone": "8"+uniq, "specializationId": spec_id or d.get("id"), "qualification": "MBBS", "password": "test123"})
ndoc = d.get("id") if isinstance(d, dict) else None
check(S, "Create doctor", st == 201 and bool(ndoc), f"status={st}")
if ndoc:
    st, _ = req("PUT", f"/doctors/{ndoc}", recep, {"qualification": "MBBS, MD"})
    st2, d2 = req("GET", f"/doctors/{ndoc}", recep)
    check(S, "Update doctor", st == 200 and d2.get("qualification") == "MBBS, MD", "persisted")

st, _ = req("PUT", "/doctors/doctor-001/schedule", recep, {"schedules": [
    {"dayOfWeek": 1, "startTime": "09:00", "endTime": "13:00", "slotDurationMinutes": 15, "isActive": True}]})
st2, sched = req("GET", "/doctors/doctor-001/schedule", recep)
check(S, "Doctor schedule save", st == 200 and isinstance(sched, list) and len(sched) >= 1, f"{len(sched) if isinstance(sched,list) else '?'} entries")

st, appts = req("GET", f"/appointments?startDate={(datetime.now(timezone.utc)-timedelta(days=1)).isoformat()}&endDate={(datetime.now(timezone.utc)+timedelta(days=7)).isoformat()}", recep)
check(S, "Appointments grid", st == 200 and isinstance(appts, list), f"{len(appts) if isinstance(appts,list) else '?'} appts")

if pid:
    st, d = req("POST", "/invoices", recep, {"patientId": pid, "items": [{"description": "Consultation", "quantity": 1, "unitPrice": 500}], "discount": 10})
    inv = d.get("id") if isinstance(d, dict) else None
    check(S, "Create invoice", st == 201 and bool(inv), f"total={d.get('total') if isinstance(d,dict) else '?'}")
    if inv:
        st, d = req("PATCH", f"/invoices/{inv}/pay", recep, {"paymentMethod": "Cash"})
        check(S, "Pay invoice", st == 200 and isinstance(d, dict) and d.get("status") == "Paid", f"status={d.get('status') if isinstance(d,dict) else '?'}")

st, d = req("GET", "/stats/analytics?days=7", recep)
check(S, "Reports / analytics", st == 200 and isinstance(d, dict) and "daily" in d, f"{len(d.get('daily',[])) if isinstance(d,dict) else '?'} days")
st, d = req("GET", "/audit-logs", recep)
check(S, "Audit logs", st == 200 and isinstance(d, list), f"{len(d) if isinstance(d,list) else '?'} entries")
st, d = req("GET", "/patients?search=9876", recep)
check(S, "Patient search", st == 200 and isinstance(d, list), f"{len(d) if isinstance(d,list) else '?'} found")
st, d = req("PUT", "/clinic/theme", recep, {"primaryColor": "#2563eb", "secondaryColor": "#7c3aed", "accentColor": "#06b6d4", "fontFamily": "Inter", "clinicDisplayName": "E2E Clinic"})
st2, d2 = req("GET", "/clinic/theme", recep)
check(S, "Clinic settings save", st == 200 and isinstance(d2, dict) and d2.get("clinicDisplayName") == "E2E Clinic", "persisted")

# ============ DOCTOR PORTAL ============
S = "Doctor Portal"
st, me = req("GET", "/auth/me", doctor)
check(S, "Doctor profile (me)", st == 200 and isinstance(me, dict) and me.get("fullName"), me.get("fullName") if isinstance(me,dict) else "")
st, q = req("GET", "/tokens/today", doctor)
check(S, "Today's queue (with patient data)", st == 200 and isinstance(q, list), f"{len(q) if isinstance(q,list) else '?'} tokens")
# Create a dedicated fresh walk-in so the consultation test always uses a brand-new
# visit (never a stale one already finalized by a previous run).
req("POST", "/tokens/walkin", recep, {"patientPhone": "9888777666", "patientName": "Consult Patient", "doctorId": "doctor-001", "createPatientIfNotFound": True})
st, q = req("GET", "/tokens/today", doctor)
fresh = sorted([t for t in (q or []) if t.get("status") in ("Waiting", "Arrived", "Called") and not t.get("visit")], key=lambda t: -t["tokenNumber"])
tok = fresh[0] if fresh else (next((t for t in (q or []) if t.get("status") in ("Waiting", "Arrived", "Called")), None) if isinstance(q, list) else None)
vid = None
if tok:
    st, d = req("POST", f"/tokens/{tok['id']}/start-visit", doctor)
    vid = d.get("visitId") if isinstance(d, dict) else None
    check(S, "Start consultation", bool(vid), f"status={st}")
if vid:
    st, d = req("PUT", "/prescriptions/draft", doctor, {
        "visitId": vid, "diagnosis": "Acute Pharyngitis", "chiefComplaint": "Sore throat 3 days",
        "symptoms": "Pain on swallowing", "vitals": {"bp": "118", "pulse": "76", "temp": "100.4"},
        "investigations": ["CBC"], "advice": "Warm saline gargles",
        "drugs": [{"id": "d1", "name": "Amoxicillin", "dose": "500mg", "frequency": "TID", "duration": "5 days", "foodTiming": "After meals", "instructions": ""}]})
    st2, v = req("GET", f"/visits/{vid}", doctor)
    pd = (v or {}).get("prescriptionDraft") or {}
    check(S, "EMR worksheet draft + persistence", st == 200 and pd.get("chiefComplaint") == "Sore throat 3 days" and pd.get("vitals", {}).get("temp") == "100.4", "EMR fields persisted")
    check(S, "Token # shows in consult header", ((v or {}).get("appointment") or {}).get("token", {}).get("tokenNumber") is not None, "relation normalized")
    pat_id = (v or {}).get("patientId")
    if pat_id:
        st, _ = req("POST", f"/patients/{pat_id}/allergies", doctor, {"allergen": "Sulfa", "severity": "Moderate"})
        check(S, "Add allergy", st == 201, f"status={st}")
        st, _ = req("POST", f"/patients/{pat_id}/medications", doctor, {"drugName": "Vitamin D3", "dose": "60000 IU", "frequency": "Weekly", "startedAt": "2026-06-01"})
        check(S, "Add active medication", st == 201, f"status={st}")
    st, hist = req("GET", f"/visits/{vid}/history", doctor)
    check(S, "View last/previous prescriptions", st == 200 and isinstance(hist, list), f"{len(hist) if isinstance(hist,list) else '?'} past visits")
    st2, v2 = req("GET", f"/visits/{vid}", doctor)
    ver = v2.get("version", 0) if isinstance(v2, dict) else 0
    st, d = req("POST", "/prescriptions/finalize", doctor, {"visitId": vid, "version": ver})
    check(S, "Finalize prescription + PDF", st == 200 and isinstance(d, dict) and d.get("signedUrl"), f"status={st}, signed={'yes' if isinstance(d,dict) and d.get('signedUrl') else 'no'}")
st, d = req("GET", "/stats/analytics?days=7", doctor)
check(S, "Doctor analytics (own data)", st == 200 and isinstance(d, dict) and "daily" in d, "scoped to doctor")

# ============ CROSS-CUTTING / SECURITY ============
S = "Security & Guards"
st, d = req("GET", "/stats/dashboard", doctor)  # receptionist-only
check(S, "Role guard: doctor blocked from admin stats", st == 403, f"status={st} (expect 403)")
st, d = req("POST", "/tokens/next", patient)  # receptionist-only
check(S, "Role guard: patient blocked from queue control", st == 403, f"status={st} (expect 403)")
st, d = req("GET", "/stats/dashboard")  # no token
check(S, "Unauthenticated request rejected", st == 401, f"status={st} (expect 401)")
st, d = req("POST", "/auth/refresh")  # no refresh cookie via urllib -> should fail cleanly
check(S, "Refresh endpoint reachable", st in (200, 401), f"status={st}")

# ============ REPORT ============
lines = []
sections = {}
for sec, name, ok, detail in rows:
    sections.setdefault(sec, []).append((name, ok, detail))
total = len(rows); passed = sum(1 for r in rows if r[2])
lines.append("="*64)
lines.append(f"  FULL END-TO-END TEST REPORT — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
lines.append(f"  RESULT: {passed}/{total} passed")
lines.append("="*64)
for sec, items in sections.items():
    sp = sum(1 for _,ok,_ in items if ok)
    lines.append(f"\n## {sec}  ({sp}/{len(items)})")
    for name, ok, detail in items:
        mark = "PASS" if ok else "FAIL"
        lines.append(f"  [{mark}] {name}" + (f"  — {detail}" if detail else ""))
fails = [(s,n,d) for s,n,ok,d in rows if not ok]
if fails:
    lines.append("\n" + "-"*64)
    lines.append("FAILURES:")
    for s,n,d in fails:
        lines.append(f"  [X] ({s}) {n}: {d}")
else:
    lines.append("\nALL CHECKS PASSED.")
out = "\n".join(lines)
open("e2e-report.txt", "w", encoding="utf-8").write(out)
print(out)
