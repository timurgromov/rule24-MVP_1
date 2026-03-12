"""Insert a test therapist user if it does not exist.

Run from `backend/` after applying migrations:
    python scripts/seed_test_user.py
"""

from sqlalchemy import text

from core.config import get_settings
from db.session import engine

# BCrypt hash for password: test1234
DEFAULT_PASSWORD_HASH = "$2b$12$8J4jV9uXhI3fJ.jF4QJ01OU2r9RQEBh8O19E5x40v0iNfZQQ9nK4e"


def main() -> None:
    settings = get_settings()

    insert_sql = text(
        """
        INSERT INTO users (email, password_hash, name, created_at)
        VALUES (:email, :password_hash, :name, NOW())
        ON CONFLICT (email) DO NOTHING
        """
    )

    with engine.begin() as connection:
        connection.execute(
            insert_sql,
            {
                "email": "test.therapist@rule24.local",
                "password_hash": DEFAULT_PASSWORD_HASH,
                "name": "Test Therapist",
            },
        )

    print(f"Seed user ensured in database: {settings.database_url}")


if __name__ == "__main__":
    main()
