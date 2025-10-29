import json
from channels.generic.websocket import AsyncWebsocketConsumer


active_host = None
viewer_count = 0



class ScreenShareConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = 'screenshare'
        self.room_group_name = f"screenshare_{self.room_name}"
        self.is_host = False
        self.viewer_id = None

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        print(f"New connection: {self.channel_name} to group {self.room_group_name}")

    async def disconnect(self, close_code):
        global active_host, viewer_count

        if self.is_host and active_host == self.channel_name:
            active_host = None
            print(f"Host disconnected, clearing active host.")

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'host_stopped',
                }
            )
        if self.viewer_id:
            viewer_count = max(0, viewer_count-1)
            print(f"Viewer {self.viewer_id} disconnected, total viewers: {viewer_count}")


            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'viewer_count_update',
                    'count': viewer_count
                }
            )

        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        print(f"Connection closed: {self.channel_name}")
    
    async def receive(self, text_data):
        global active_host, viewer_count

        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'host-ready' or message_type == 'host-redy':
                if active_host and active_host != self.channel_name:

                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': 'Another host is already active.'
                    }))
                    return
                
                active_host = self.channel_name
                self.is_host = True
                print(f"Host {self.channel_name} is now active.")

                await self.send(text_data=json.dumps({
                    'type': 'viewer-count',
                    'count': viewer_count
                }))
            elif message_type == 'viewer-joined':
                viewer_count += 1
                self.viewer_id = data.get('viewer_id')
                print(f"Viewer {self.viewer_id} joined, total viewers: {viewer_count}")

                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'viewer_count_update',
                        'count': viewer_count
                    }
                )
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'webrtc_message',
                    'message': data
                }
            )


        except json.JSONDecodeError:
            print("Received invalid JSON data.")
    

    async def webrtc_message(self, event):
        message = event['message']

        await self.send(text_data=json.dumps(message))

    async def viewer_count_update(self, event):
        count = event['count']

        await self.send(text_data=json.dumps({
            'type': 'viewer-count',
            'count': count
        }))

    async def host_stopped(self, event):
        await self.send(text_data=json.dumps({
            'type': 'host-stopped',
            'message': 'The host has stopped sharing the screen.'
        }))
        print("Host has stopped sharing the screen.")
