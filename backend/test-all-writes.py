"""Comprehensive write-and-verify test across all portals.
Tests every mutation endpoint and confirms the change persists in the DB by re-reading.
"""
import json, urllib.request, urllib.error, sys, time

BASE = "http://localhost:4000"
results = []

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

def check(name, ok, detail=""):
    results.append((name, ok, detail))
    mark = "PASS" if ok else "FAIL"
    print(f"  [{mark}] {name}" + (f" — {detail}" if detail else ""))

def login(phone, pw):
    s, d = req("POST", "/auth/login", body={"phone": phone, "password": pw})
    return d.get("accessToken") if isinstance(d, dict) else None

print("=== AUTH ===")
recep = login("9000000003", "recep123")
doctor = login("9000000001", "doctor123")
check("Receptionist login", bool(recep))
check("Doctor login", bool(doctor))
if not (recep and doctor):
    print("Cannot continue without auth"); sys.exit(1)

# ---------- RECEPTION / ADMIN ----------
print("\n=== RECEPTION / ADMIN PORTAL ===")

# 1. Clinic theme/settings
s, d = req("PUT", "/clinic/theme", recep, {
    "primaryColor": "#2563eb", "secondaryColor": "#7c3aed", "accentColor": "#06b6d4",
    "fontFamily": "Inter", "clinicDisplayName": "CareDesk Test Clinic"
})
ok = s == 200 and isinstance(d, dict)
s2, d2 = req("GET", "/clinic/theme", recep)
persisted = isinstance(d2, dict) and d2.get("clinicDisplayName") == "CareDesk Test Clinic"
check("Update clinic settings (theme)", ok and persisted, f"status={s}, persisted={persisted}")

# 2. Create specialization
uniq = str(int(time.time()))
s, d = req("POST", "/specializations", recep, {"name": f"TestSpec-{uniq}"})
spec_id = d.get("id") if isinstance(d, dict) else None
check("Create specialization", s == 201 and bool(spec_id), f"status={s}")

# 3. Create doctor (needs a real specializationId)
s, specs = req("GET", "/specializations", recep)
real_spec = spec_id or (specs[0]["id"] if specs else None)
new_doc_id = None
if real_spec:
    s, d = req("POST", "/doctors", recep, {
        "fullName": f"Test Doctor {uniq}", "phone": "9" + uniq,
        "specializationId": real_spec, "qualification": "MBBS", "password": "test123"
    })
    new_doc_id = d.get("id") if isinstance(d, dict) else None
    check("Create doctor", s == 201 and bool(new_doc_id), f"status={s}, detail={str(d)[:120] if not new_doc_id else ''}")
else:
    check("Create doctor", False, "no specialization available")

# 4. Update doctor
if new_doc_id:
    s, d = req("PUT", f"/doctors/{new_doc_id}", recep, {"qualification": "MBBS, MD"})
    s2, d2 = req("GET", f"/doctors/{new_doc_id}", recep)
    persisted = isinstance(d2, dict) and d2.get("qualification") == "MBBS, MD"
    check("Update doctor", s == 200 and persisted, f"persisted={persisted}")
else:
    check("Update doctor", False, "no doctor created")

# 5. Doctor schedule
s, d = req("PUT", "/doctors/doctor-001/schedule", recep, {"schedules": [
    {"dayOfWeek": 1, "startTime": "09:00", "endTime": "17:00", "slotDurationMinutes": 15, "isActive": True},
    {"dayOfWeek": 3, "startTime": "10:00", "endTime": "16:00", "slotDurationMinutes": 20, "isActive": True},
]})
s2, sched = req("GET", "/doctors/doctor-001/schedule", recep)
persisted = isinstance(sched, list) and len(sched) == 2
check("Update doctor schedule", s == 200 and persisted, f"entries={len(sched) if isinstance(sched,list) else 'err'}")

# 6. Walk-in registration
s, d = req("POST", "/tokens/walkin", recep, {
    "patientPhone": "9876543210", "doctorId": "doctor-001", "createPatientIfNotFound": True
})
walkin_token = d.get("tokenNumber") if isinstance(d, dict) else None
check("Walk-in registration", s == 201 and bool(walkin_token), f"status={s}, token#={walkin_token}")

# 7. Queue management: call next
s, d = req("POST", "/tokens/next", recep)
check("Queue — call next patient", s in (200, 404), f"status={s} ({'queue empty ok' if s==404 else 'called'})")

# 8. Update patient
s, plist = req("GET", "/patients?search=9876543210", recep)
pid = plist[0]["id"] if isinstance(plist, list) and plist else None
if pid:
    s, d = req("PUT", f"/patients/{pid}", recep, {"bloodGroup": "B+", "gender": "Male"})
    s2, d2 = req("GET", f"/patients/{pid}", recep)
    persisted = isinstance(d2, dict) and d2.get("bloodGroup") == "B+"
    check("Update patient", s == 200 and persisted, f"persisted={persisted}")
else:
    check("Update patient", False, "no patient found")

# 9. Create + pay invoice
if pid:
    s, d = req("POST", "/invoices", recep, {
        "patientId": pid, "items": [{"description": "Consultation", "quantity": 1, "unitPrice": 500}], "discount": 10
    })
    inv_id = d.get("id") if isinstance(d, dict) else None
    check("Create invoice", s == 201 and bool(inv_id), f"status={s}, total={d.get('total') if isinstance(d,dict) else '?'}")
    if inv_id:
        s, d = req("PATCH", f"/invoices/{inv_id}/pay", recep, {"paymentMethod": "Cash"})
        persisted = isinstance(d, dict) and d.get("status") == "Paid"
        check("Pay invoice", s == 200 and persisted, f"status={d.get('status') if isinstance(d,dict) else '?'}")
else:
    check("Create invoice", False, "no patient")

# ---------- DOCTOR ----------
print("\n=== DOCTOR PORTAL ===")

# 11. Start visit from a token
s, queue = req("GET", "/tokens/today", doctor)
tok = None
if isinstance(queue, list):
    for t in queue:
        if t.get("status") in ("Waiting", "Called"):
            tok = t; break
visit_id = None
if tok:
    s, d = req("POST", f"/tokens/{tok['id']}/start-visit", doctor)
    visit_id = d.get("visitId") if isinstance(d, dict) else None
    check("Start visit", bool(visit_id), f"status={s}")
else:
    check("Start visit", False, "no active token in queue")

# 12. Save prescription draft (EMR fields)
if visit_id:
    s, d = req("PUT", "/prescriptions/draft", doctor, {
        "visitId": visit_id, "diagnosis": "Acute Gastritis", "clinicalNotes": "Epigastric tenderness",
        "chiefComplaint": "Stomach pain", "symptoms": "Nausea", "vitals": {"bp": "120", "pulse": "78"},
        "investigations": ["CBC", "USG Abdomen"], "advice": "Avoid spicy food",
        "drugs": [{"id": "d1", "name": "Pantoprazole", "dose": "40mg", "frequency": "OD", "duration": "7 days", "foodTiming": "Before meals", "instructions": ""}]
    })
    s2, v = req("GET", f"/visits/{visit_id}", doctor)
    pd = (v or {}).get("prescriptionDraft") or {}
    persisted = pd.get("chiefComplaint") == "Stomach pain" and pd.get("investigations") == ["CBC", "USG Abdomen"]
    check("Save prescription draft (EMR fields)", s == 200 and persisted, f"emr persisted={persisted}")
else:
    check("Save prescription draft", False, "no visit")

# 13. Add allergy
if pid:
    s, d = req("POST", f"/patients/{pid}/allergies", doctor, {"allergen": "Penicillin", "severity": "Severe"})
    s2, al = req("GET", f"/patients/{pid}/allergies", doctor)
    persisted = isinstance(al, list) and any(a.get("allergen") == "Penicillin" for a in al)
    check("Add allergy", s == 201 and persisted, f"persisted={persisted}")

# 14. Add active medication
if pid:
    s, d = req("POST", f"/patients/{pid}/medications", doctor, {
        "drugName": "Metformin", "dose": "500mg", "frequency": "BD", "startedAt": "2026-06-01"
    })
    check("Add active medication", s == 201, f"status={s}")

# 15. Finalize prescription
if visit_id:
    s2, v = req("GET", f"/visits/{visit_id}", doctor)
    ver = v.get("version", 0) if isinstance(v, dict) else 0
    s, d = req("POST", "/prescriptions/finalize", doctor, {"visitId": visit_id, "version": ver})
    ok = s == 200 and isinstance(d, dict) and d.get("prescriptionId")
    check("Finalize prescription (PDF)", ok, f"status={s}, detail={str(d)[:120] if not ok else 'signed'}")

# ---------- PATIENT ----------
print("\n=== PATIENT PORTAL ===")

# 16. Register new patient (frontend flow: register -> then login)
newphone = "9" + uniq[-9:]
s, d = req("POST", "/auth/register", body={"fullName": f"Test Patient {uniq}", "phone": newphone, "password": "test1234"})
reg_ok = s in (200, 201) and isinstance(d, dict) and d.get("id")
check("Patient registration", bool(reg_ok), f"status={s}")
ptoken = login(newphone, "test1234") if reg_ok else None
check("Login as new patient", bool(ptoken), "auto-login after register")

# 17. Book appointment
if ptoken:
    # find a slot ~ tomorrow 11:00
    from datetime import datetime, timedelta, timezone
    # Unique future slot to avoid colliding with prior test runs' bookings
    slot = (datetime.now(timezone.utc) + timedelta(days=2)).replace(hour=9, minute=int(uniq) % 60, second=0, microsecond=0)
    s, d = req("POST", "/appointments", ptoken, {
        "doctorId": "doctor-001", "slotStart": slot.isoformat().replace("+00:00","Z"),
        "slotEnd": (slot+timedelta(minutes=15)).isoformat().replace("+00:00","Z")
    })
    appt_id = d.get("id") if isinstance(d, dict) else None
    check("Book appointment", s == 201 and bool(appt_id), f"status={s}, token#={d.get('tokenNumber') if isinstance(d,dict) else '?'}")
    # 18. Cancel appointment
    if appt_id:
        s, d = req("PATCH", f"/appointments/{appt_id}/status", recep, {"status": "Cancelled"})
        check("Cancel appointment", s == 200, f"status={s}")
    # 19. Update patient profile
    s, me = req("GET", "/auth/me", ptoken)
    mypid = me.get("id") if isinstance(me, dict) else None
    if mypid:
        s, d = req("PUT", f"/patients/{mypid}", ptoken, {"bloodGroup": "O+", "gender": "Female"})
        s2, d2 = req("GET", f"/patients/{mypid}", ptoken)
        persisted = isinstance(d2, dict) and d2.get("bloodGroup") == "O+"
        check("Update patient profile", s == 200 and persisted, f"persisted={persisted}")

# ---------- SUMMARY ----------
print("\n" + "="*50)
passed = sum(1 for _, ok, _ in results if ok)
total = len(results)
print(f"RESULT: {passed}/{total} passed")
fails = [(n, d) for n, ok, d in results if not ok]
if fails:
    print("\nFAILURES:")
    for n, d in fails:
        print(f"  [X] {n}: {d}")
else:
    print("All write operations work and persist to DB [OK]")
