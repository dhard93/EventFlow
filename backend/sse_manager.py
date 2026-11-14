import asyncio
from collections import defaultdict

connections = defaultdict(dict)


async def connect(organization_id, user_id):
    queue = asyncio.Queue()
    connections[organization_id][user_id] = queue
    return queue


def disconnect(organization_id, user_id, queue):
    if connections.get(organization_id, {}).get(user_id) is queue:
        connections[organization_id].pop(user_id, None)


async def send_to_org(organization_id, event):
    for queue in connections.get(organization_id, {}).values():
        await queue.put(event)


async def send_to_user(organization_id, user_id, event):
    queue = connections.get(organization_id, {}).get(user_id)
    if queue:
        await queue.put(event)