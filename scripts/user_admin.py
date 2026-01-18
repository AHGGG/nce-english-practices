#!/usr/bin/env python3
"""
User Management CLI - Admin tools for user and data management.

Usage:
    # Create a new user
    uv run python scripts/user_admin.py create-user --email admin@example.com --password secret123

    # List all users  
    uv run python scripts/user_admin.py list-users

    # Migrate data from default_user to a specific user
    uv run python scripts/user_admin.py migrate-data --to-user-id 1

    # Migrate data between users
    uv run python scripts/user_admin.py migrate-data --from-user default_user --to-user-id 2
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import click
from rich.console import Console
from rich.table import Table

console = Console()


async def get_db_session():
    """Get an async database session."""
    from app.core.db import AsyncSessionLocal
    return AsyncSessionLocal()


@click.group()
def cli():
    """User administration CLI for NCE English Practice."""
    pass


@cli.command("create-user")
@click.option("--email", required=True, help="User email address")
@click.option("--password", required=True, help="User password")
@click.option("--username", default=None, help="Display username (optional)")
@click.option("--role", default="user", type=click.Choice(["user", "admin"]), help="User role")
def create_user(email: str, password: str, username: str, role: str):
    """Create a new user account."""
    
    async def _create():
        from app.services.auth import create_user as auth_create_user, get_user_by_email
        
        async with await get_db_session() as db:
            # Check if user exists
            existing = await get_user_by_email(db, email)
            if existing:
                console.print(f"[red]Error:[/red] User with email '{email}' already exists.")
                return False
            
            try:
                user = await auth_create_user(
                    db=db,
                    email=email,
                    password=password,
                    username=username,
                    role=role,
                )
                console.print(f"[green]✓[/green] User created successfully!")
                console.print(f"  ID: {user.id}")
                console.print(f"  Email: {user.email}")
                console.print(f"  Username: {user.username or '(none)'}")
                console.print(f"  Role: {user.role}")
                return True
            except ValueError as e:
                console.print(f"[red]Error:[/red] {e}")
                return False
    
    asyncio.run(_create())


@cli.command("list-users")
@click.option("--include-deleted", is_flag=True, help="Include soft-deleted users")
def list_users(include_deleted: bool):
    """List all registered users."""
    
    async def _list():
        from sqlalchemy import select
        from app.models.orm import User
        
        async with await get_db_session() as db:
            query = select(User)
            if not include_deleted:
                query = query.where(User.deleted_at.is_(None))
            query = query.order_by(User.id)
            
            result = await db.execute(query)
            users = result.scalars().all()
            
            if not users:
                console.print("[yellow]No users found.[/yellow]")
                return
            
            table = Table(title="Registered Users")
            table.add_column("ID", style="cyan")
            table.add_column("Email", style="white")
            table.add_column("Username", style="white")
            table.add_column("Role", style="magenta")
            table.add_column("Active", style="green")
            table.add_column("Last Login", style="dim")
            
            for user in users:
                table.add_row(
                    str(user.id),
                    user.email,
                    user.username or "-",
                    user.role,
                    "✓" if user.is_active else "✗",
                    user.last_login_at.strftime("%Y-%m-%d %H:%M") if user.last_login_at else "-",
                )
            
            console.print(table)
    
    asyncio.run(_list())


@cli.command("migrate-data")
@click.option("--from-user", default="default_user", help="Source user ID (default: 'default_user')")
@click.option("--to-user-id", required=True, type=int, help="Target user ID (numeric)")
@click.option("--dry-run", is_flag=True, help="Show what would be migrated without making changes")
def migrate_data(from_user: str, to_user_id: int, dry_run: bool):
    """Migrate learning data from one user to another."""
    
    async def _migrate():
        from sqlalchemy import select, update, func
        from app.models.orm import (
            User,
            ContextLearningRecord,
            WordProficiency,
            VocabLearningLog,
            UserComprehensionProfile,
            UserGoal,
            ReadingSession,
            UserCalibration,
            SentenceLearningRecord,
            VoiceSession,
            ReviewItem,
        )
        from app.services.auth import get_user_by_id
        
        async with await get_db_session() as db:
            # Verify target user exists
            target_user = await get_user_by_id(db, to_user_id)
            if not target_user:
                console.print(f"[red]Error:[/red] Target user ID {to_user_id} not found.")
                return False
            
            console.print(f"\n[bold]Migration Plan[/bold]")
            console.print(f"  From: [cyan]{from_user}[/cyan]")
            console.print(f"  To:   [cyan]{target_user.email}[/cyan] (ID: {to_user_id})")
            console.print()
            
            # Models to migrate (with their display names)
            models_to_migrate = [
                (ContextLearningRecord, "Context Learning Records"),
                (WordProficiency, "Word Proficiency"),
                (VocabLearningLog, "Vocab Learning Logs"),
                (UserComprehensionProfile, "Comprehension Profiles"),
                (UserGoal, "User Goals"),
                (ReadingSession, "Reading Sessions"),
                (UserCalibration, "Calibration Data"),
                (SentenceLearningRecord, "Sentence Learning Records"),
                (VoiceSession, "Voice Sessions"),
                (ReviewItem, "Review Items"),
            ]
            
            new_user_id_str = str(to_user_id)
            total_migrated = 0
            
            table = Table(title="Data to Migrate" if dry_run else "Migration Results")
            table.add_column("Table", style="white")
            table.add_column("Records", style="cyan", justify="right")
            table.add_column("Status", style="green")
            
            for model, name in models_to_migrate:
                # Count records
                count_result = await db.execute(
                    select(func.count()).where(model.user_id == from_user)
                )
                count = count_result.scalar()
                
                if count > 0:
                    if dry_run:
                        table.add_row(name, str(count), "[yellow]Would migrate[/yellow]")
                    else:
                        # Actually migrate
                        await db.execute(
                            update(model)
                            .where(model.user_id == from_user)
                            .values(user_id=new_user_id_str)
                        )
                        table.add_row(name, str(count), "[green]✓ Migrated[/green]")
                    total_migrated += count
                else:
                    table.add_row(name, "0", "[dim]No data[/dim]")
            
            console.print(table)
            
            if dry_run:
                console.print(f"\n[yellow]Dry run:[/yellow] {total_migrated} total records would be migrated.")
                console.print("Run without --dry-run to apply changes.")
            else:
                await db.commit()
                console.print(f"\n[green]✓[/green] Successfully migrated {total_migrated} records to user {target_user.email}.")
            
            return True
    
    asyncio.run(_migrate())


@cli.command("set-password")
@click.option("--user-id", required=True, type=int, help="User ID")
@click.option("--password", required=True, help="New password")
def set_password(user_id: int, password: str):
    """Reset a user's password."""
    
    async def _set():
        from sqlalchemy import update
        from app.models.orm import User
        from app.services.auth import get_password_hash, get_user_by_id
        
        async with await get_db_session() as db:
            user = await get_user_by_id(db, user_id)
            if not user:
                console.print(f"[red]Error:[/red] User ID {user_id} not found.")
                return False
            
            hashed = get_password_hash(password)
            await db.execute(
                update(User).where(User.id == user_id).values(hashed_password=hashed)
            )
            await db.commit()
            
            console.print(f"[green]✓[/green] Password updated for {user.email}")
            return True
    
    asyncio.run(_set())


@cli.command("deactivate-user")
@click.option("--user-id", required=True, type=int, help="User ID to deactivate")
def deactivate_user(user_id: int):
    """Deactivate a user account (soft disable, can be reactivated)."""
    
    async def _deactivate():
        from sqlalchemy import update
        from app.models.orm import User
        from app.services.auth import get_user_by_id
        
        async with await get_db_session() as db:
            user = await get_user_by_id(db, user_id)
            if not user:
                console.print(f"[red]Error:[/red] User ID {user_id} not found.")
                return False
            
            await db.execute(
                update(User).where(User.id == user_id).values(is_active=False)
            )
            await db.commit()
            
            console.print(f"[green]✓[/green] User {user.email} has been deactivated.")
            return True
    
    asyncio.run(_deactivate())


@cli.command("activate-user")
@click.option("--user-id", required=True, type=int, help="User ID to activate")
def activate_user(user_id: int):
    """Reactivate a deactivated user account."""
    
    async def _activate():
        from sqlalchemy import update
        from app.models.orm import User
        from app.services.auth import get_user_by_id
        
        async with await get_db_session() as db:
            user = await get_user_by_id(db, user_id)
            if not user:
                console.print(f"[red]Error:[/red] User ID {user_id} not found.")
                return False
            
            await db.execute(
                update(User).where(User.id == user_id).values(is_active=True)
            )
            await db.commit()
            
            console.print(f"[green]✓[/green] User {user.email} has been activated.")
            return True
    
    asyncio.run(_activate())


if __name__ == "__main__":
    cli()
