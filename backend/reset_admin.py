import asyncio
import os
import asyncpg
from passlib.context import CryptContext

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def reset_admin():
    dsn = "postgresql://postgres:dmiqBYdcAVcnCbigUwddCdRJCGKecIyH@maglev.proxy.rlwy.net:26464/railway"
    conn = await asyncpg.connect(dsn=dsn)
    try:
        new_hash = _pwd_ctx.hash("Admin1234!")
        await conn.execute("UPDATE clinicians SET password_hash = $1 WHERE email = 'admin@clinic.com'", new_hash)
        print("Password reset successfully!")
    finally:
        await conn.close()

asyncio.run(reset_admin())
