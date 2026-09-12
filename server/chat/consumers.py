"""
chat/consumers.py — ChatConsumer (AsyncWebsocketConsumer)

WebSocket route: /ws/chat/<conversation_id>/

Responsibilities:
  - Authenticate user from scope['user'] (set by JWTAuthMiddleware)
  - Verify participant is part of this conversation
  - Join the channel group: chat_<conversation_id>
  - Receive and broadcast: chat.message, chat.typing, chat.read
  - Save messages to DB
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

from .models import Conversation, Message


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user = self.scope.get('user')
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f"chat_{self.conversation_id}"

        # Security: must be authenticated
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)  # 4001 = Unauthorized
            return

        # Security: must be a participant of this conversation
        is_participant = await self.verify_participant()
        if not is_participant:
            await self.close(code=4003)  # 4003 = Forbidden
            return

        # Join the room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        """Handle incoming WebSocket messages from the client."""
        try:
            data = json.loads(text_data)
        except (json.JSONDecodeError, TypeError):
            return

        msg_type = data.get('type')

        if msg_type == 'chat.message':
            content = data.get('content', '').strip()
            if not content:
                return

            # Save to DB
            message = await self.save_message(content)

            # Broadcast to all in the room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'id': message.id,
                    'sender_id': self.user.id,
                    'content': message.content,
                    'created_at': message.created_at.isoformat(),
                    'file_url': None,
                    'file_name': '',
                }
            )

        elif msg_type == 'chat.typing':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_typing',
                    'sender_id': self.user.id,
                }
            )

        elif msg_type == 'chat.read':
            await self.mark_messages_read()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_read',
                    'reader_id': self.user.id,
                }
            )

        elif msg_type == 'chat.file_sent':
            # Notify room that a file message was sent via REST (file_url is from Cloudinary)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'id': data.get('id'),
                    'sender_id': self.user.id,
                    'content': data.get('content', ''),
                    'created_at': data.get('created_at', ''),
                    'file_url': data.get('file_url'),
                    'file_name': data.get('file_name', ''),
                }
            )

    # ── Group Message Handlers ───────────────────────────────────────────────

    async def chat_message(self, event):
        """Receive from group, send to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': 'chat.message',
            'id': event['id'],
            'sender_id': event['sender_id'],
            'content': event['content'],
            'created_at': event['created_at'],
            'file_url': event.get('file_url'),
            'file_name': event.get('file_name', ''),
        }))

    async def chat_typing(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat.typing',
            'sender_id': event['sender_id'],
        }))

    async def chat_read(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat.read',
            'reader_id': event['reader_id'],
        }))

    # ── DB Helpers ───────────────────────────────────────────────────────────

    @database_sync_to_async
    def verify_participant(self):
        """Return True if self.user is the client or trainer of this conversation."""
        return Conversation.objects.filter(
            id=self.conversation_id
        ).filter(
            # client OR trainer
            **{'client': self.user}
        ).exists() or Conversation.objects.filter(
            id=self.conversation_id,
            trainer=self.user,
        ).exists()

    @database_sync_to_async
    def save_message(self, content):
        conversation = Conversation.objects.get(id=self.conversation_id)
        msg = Message.objects.create(
            conversation=conversation,
            sender=self.user,
            content=content,
        )
        # Touch conversation updated_at so it sorts to top
        conversation.save(update_fields=['updated_at'])
        return msg

    @database_sync_to_async
    def mark_messages_read(self):
        """Mark all messages in this conversation not sent by me as read."""
        Message.objects.filter(
            conversation_id=self.conversation_id,
            is_read=False,
        ).exclude(sender=self.user).update(is_read=True)
