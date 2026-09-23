import sys

from .database import SessionLocal
from .seed import create_super_admin


def main():
    if len(sys.argv) != 3:
        print("Usage: python -m app.seed_cli <username> <password>")
        sys.exit(1)

    username, password = sys.argv[1], sys.argv[2]
    db = SessionLocal()
    try:
        user = create_super_admin(db, username, password)
        print(f"Super admin ready: {user.username} (id={user.id})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
