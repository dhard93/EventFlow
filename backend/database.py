import psycopg2
import os

connection = psycopg2.connect(
    host=os.getenv("DB_HOST", "db"),
    port=os.getenv("DB_PORT", "5432"),
    dbname=os.getenv("DB_NAME", "EventFlowDB"),
    user=os.getenv("DB_USER", "demo"),
    password=os.getenv("DB_PASSWORD", "demo-password")
)