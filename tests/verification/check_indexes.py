from sqlalchemy import Column, Integer, String, create_mock_engine
from sqlalchemy.orm import DeclarativeBase, mapped_column, Mapped
from sqlalchemy.schema import CreateTable

class Base(DeclarativeBase):
    pass

class TestModel(Base):
    __tablename__ = 'test_model'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Case 1: unique=True and index=True
    col1: Mapped[str] = mapped_column(String, unique=True, index=True)
    # Case 2: unique=True only
    col2: Mapped[str] = mapped_column(String, unique=True)
    # Case 3: index=True only
    col3: Mapped[str] = mapped_column(String, index=True)

def dump(sql, *multiparams, **params):
    print(sql.compile(dialect=engine.dialect))

engine = create_mock_engine("postgresql://", dump)

print("--- Postgres DDL ---")
dump(CreateTable(TestModel.__table__))

engine_sqlite = create_mock_engine("sqlite://", dump)
print("\n--- SQLite DDL ---")
dump(CreateTable(TestModel.__table__))
