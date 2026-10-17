from fastapi import FastAPI
from routers import organizations, venues, spaces, users, resources, events, conversations, messages, notifications
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(organizations.router)
app.include_router(venues.router)
app.include_router(spaces.router)
app.include_router(users.router)
app.include_router(events.router)
app.include_router(conversations.router)
app.include_router(messages.router)
app.include_router(notifications.router)
app.include_router(resources.router)