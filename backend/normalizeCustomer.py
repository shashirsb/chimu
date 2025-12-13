import csv
import json
import re
from datetime import datetime

INPUT_CSV = "input.csv"
OUTPUT_JSON = "output.json"
ACCOUNT_ID = { "$oid": "691601e82c9db1f168e850d4" }


# --------------------------------------------------
# ✅ EMAIL GENERATOR
# --------------------------------------------------
def generate_email(name):
    if not name or not str(name).strip():
        return None

    cleaned = re.sub(r"[^a-zA-Z ]", "", str(name)).strip().lower()
    if not cleaned:
        return None

    parts = cleaned.split()

    if len(parts) == 1:
        return f"{parts[0]}@jpmc.com"
    elif len(parts) == 2:
        first, last = parts
        return f"{first}.{last}@jpmc.com"
    else:
        first = parts[0]
        middle = parts[1][0]
        last = parts[-1]
        return f"{first}.{middle}.{last}@jpmc.com"


# --------------------------------------------------
# ✅ BASE TARGET SCHEMA
# --------------------------------------------------
def base_schema():
    now = datetime.utcnow().isoformat() + "Z"

    return {
        "name": "",
        "email": "",
        "designation": "",
        "location": "",
        "sentiment": "Unknown",
        "awareness": "Unknown",
        "decisionMaker": False,
        "type": "techChampion",
        "reportingTo": [],   # ✅ EMAIL ONLY
        "reportees": [],     # ✅ EMAIL ONLY
        "logHistory": [],
        "accountId": ACCOUNT_ID,
        "annualCost": "$ 0.00",
        "annualMDBCost": "$ 0.00",
        "ao": "",
        "appNames": [],
        "businessUnit": [],
        "cto": "",
        "monthlyMDBCost": "$ 0.00",
        "stage": "",
        "tgo": "",
        "updatedAt": {
            "$date": now
        }
    }


# --------------------------------------------------
# ✅ BUILD REPORTEES FROM REPORTINGTO
# --------------------------------------------------
def build_reportees(docs_by_email):
    for doc in docs_by_email.values():
        doc["reportees"] = []

    for doc in docs_by_email.values():
        for manager_email in doc.get("reportingTo", []):
            if manager_email in docs_by_email:
                manager_doc = docs_by_email[manager_email]
                if doc["email"] not in manager_doc["reportees"]:
                    manager_doc["reportees"].append(doc["email"])


# --------------------------------------------------
# ✅ MAIN PIPELINE (NAME-BASED HIERARCHY)
# --------------------------------------------------
def process_csv():
    raw_rows = []

    with open(INPUT_CSV, newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            raw_rows.append(row)

    # --------------------------------------------------
    # ✅ STEP 1: ADD EMAIL IF MISSING + BUILD NAME → EMAIL MAP
    # --------------------------------------------------
    name_to_email = {}

    for row in raw_rows:
        name = str(row.get("name", "")).strip()

        raw_email = row.get("email")
        if raw_email and raw_email.strip() and "@" in raw_email:
            final_email = raw_email.strip().lower()
        else:
            final_email = generate_email(name) or "unknown@jpmc.com"

        # ✅ Normalize name key (case-insensitive safe)
        name_key = name.lower()
        name_to_email[name_key] = final_email

    # --------------------------------------------------
    # ✅ STEP 2: REPLACE Reportsto (NAME) → reportingTo (EMAIL)
    # --------------------------------------------------
    email_to_doc = {}

    for row in raw_rows:
        doc = base_schema()

        name = str(row.get("name", "")).strip()
        name_key = name.lower()

        doc["name"] = name
        doc["designation"] = (row.get("designation") or "").strip()
        doc["location"] = (row.get("location") or "").strip()

        bu = row.get("businessUnit")
        if bu:
            doc["businessUnit"] = [b.strip() for b in bu.split(",")]

        # ✅ Current user email
        doc["email"] = name_to_email.get(name_key, "unknown@jpmc.com")

        # ✅ Manager name → EMAIL
        manager_name = str(row.get("Reportsto", "")).strip().lower()

        if manager_name and manager_name in name_to_email:
            doc["reportingTo"] = [name_to_email[manager_name]]

        email_to_doc[doc["email"]] = doc

    # --------------------------------------------------
    # ✅ STEP 3: BUILD REPORTEES
    # --------------------------------------------------
    build_reportees(email_to_doc)

    # --------------------------------------------------
    # ✅ OUTPUT
    # --------------------------------------------------
    documents = list(email_to_doc.values())

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(documents, f, indent=4)

    print(f"✅ SUCCESS: MongoDB-ready JSON created → {OUTPUT_JSON}")
    print("✅ Reportsto (NAME) converted to reportingTo (EMAIL)")
    print("✅ Reportees built correctly")


# --------------------------------------------------
# ✅ ENTRY POINT
# --------------------------------------------------
if __name__ == "__main__":
    process_csv()
