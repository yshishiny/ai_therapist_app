"""Drop all tables and recreate from schema.sql + migration_patient_portal.sql.
Usage: railway run python run_migration.py
"""
import os, sys, psycopg2

url = os.environ.get("DATABASE_URL")
if not url:
    print("ERROR: DATABASE_URL not set.")
    sys.exit(1)

base_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")

print("Connecting to database...")
conn = psycopg2.connect(url)
conn.autocommit = True
cur = conn.cursor()

# Step 0: Drop everything (nuclear reset — DB currently has no real data)
print("Dropping all existing tables...")
cur.execute("""
    DO $$ DECLARE
        r RECORD;
    BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
            EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
    END $$;
""")
print("✅ All tables dropped.")

# Step 1: Run schema.sql
schema_file = os.path.join(base_dir, "schema.sql")
with open(schema_file, "r", encoding="utf-8") as f:
    schema_sql = f.read()

print(f"\nRunning schema.sql ({len(schema_sql)} chars)...")
cur.execute(schema_sql)
print("✅ schema.sql completed")

# Step 2: Run migration_patient_portal.sql
migration_file = os.path.join(base_dir, "migration_patient_portal.sql")
with open(migration_file, "r", encoding="utf-8") as f:
    migration_sql = f.read()

print(f"\nRunning migration_patient_portal.sql ({len(migration_sql)} chars)...")
cur.execute(migration_sql)
print("✅ migration_patient_portal.sql completed")

# Step 3: Verify
print("\n=== Verification ===")
cur.execute("""
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' ORDER BY table_name
""")
tables = [r[0] for r in cur.fetchall()]
print(f"Tables ({len(tables)}): {tables}")

cur.execute("SELECT COUNT(*) FROM patients")
print(f"patients rows: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM patient_users")
print(f"patient_users rows: {cur.fetchone()[0]}")

cur.execute("SELECT email FROM patient_users")
emails = [r[0] for r in cur.fetchall()]
print(f"patient emails: {emails}")

cur.execute("SELECT COUNT(*) FROM clinicians")
print(f"clinicians rows: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM organisations")
print(f"organisations rows: {cur.fetchone()[0]}")

cur.close()
conn.close()
print("\n🎉 Database fully reset and ready!")
