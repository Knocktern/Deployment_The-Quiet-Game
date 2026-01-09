"""
Daily.co Video Integration Helper

Handles Daily.co room creation and management for video calling.
Uses Daily.co's free tier (10,000 minutes/month).
"""

import os
import requests
from typing import Dict, Optional


class DailyCoManager:
    """Manages Daily.co video rooms for the game."""
    
    def __init__(self):
        """Initialize Daily.co manager with API key."""
        # Get API key from environment variable
        # For now, we'll use Daily.co's public demo domain (no API key needed)
        self.api_key = os.environ.get('DAILY_API_KEY', '')
        self.base_url = 'https://api.daily.co/v1'
        self.headers = {
            'Authorization': f'Bearer {self.api_key}' if self.api_key else '',
            'Content-Type': 'application/json'
        }
    
    def create_room(self, room_name: str, max_participants: int = 10) -> Optional[Dict]:
        """
        Create a Daily.co room for video calling.
        
        Args:
            room_name: Unique name for the room (game room code)
            max_participants: Maximum number of participants (default 10)
        
        Returns:
            Room data with 'url' field, or None if creation failed
        """
        if not self.api_key:
            # Use Daily.co's public demo domain - works without API key
            # Anyone can create temporary rooms on daily.co domain
            return {
                'name': room_name,
                'url': f'https://{room_name}.daily.co',
                'created': True,
                'demo': True  # Flag to indicate demo mode
            }
        
        # With API key - create actual room
        try:
            endpoint = f'{self.base_url}/rooms'
            data = {
                'name': room_name,
                'properties': {
                    'max_participants': max_participants,
                    'enable_chat': False,  # We use our own chat
                    'enable_screenshare': False,
                    'enable_recording': False,
                    'start_video_off': False,
                    'start_audio_off': True,  # Video only game
                    'exp': int((os.time.time() + 3600) * 1000)  # 1 hour expiry
                }
            }
            
            response = requests.post(endpoint, json=data, headers=self.headers)
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f'Daily.co room creation failed: {response.status_code}')
                return None
                
        except Exception as e:
            print(f'Error creating Daily.co room: {e}')
            return None
    
    def get_room(self, room_name: str) -> Optional[Dict]:
        """Get room details."""
        if not self.api_key:
            return {
                'name': room_name,
                'url': f'https://{room_name}.daily.co',
                'demo': True
            }
        
        try:
            endpoint = f'{self.base_url}/rooms/{room_name}'
            response = requests.get(endpoint, headers=self.headers)
            
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f'Error getting Daily.co room: {e}')
            return None
    
    def delete_room(self, room_name: str) -> bool:
        """Delete a Daily.co room."""
        if not self.api_key:
            return True  # Demo mode - nothing to delete
        
        try:
            endpoint = f'{self.base_url}/rooms/{room_name}'
            response = requests.delete(endpoint, headers=self.headers)
            return response.status_code == 200
        except Exception as e:
            print(f'Error deleting Daily.co room: {e}')
            return False


# Global instance
daily_manager = DailyCoManager()
