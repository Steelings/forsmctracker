import os
import requests
from dotenv import load_dotenv

current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, '..', '.env')
load_dotenv(env_path)

CLIENT_ID = os.getenv('TWITCH_CLIENT_ID')
CLIENT_SECRET = os.getenv('TWITCH_CLIENT_SECRET')
BROADCASTER_LOGIN = 'forsen'

def get_app_access_token():

    url = f'https://id.twitch.tv/oauth2/token?client_id={CLIENT_ID}&client_secret={CLIENT_SECRET}&grant_type=client_credentials'
    response = requests.post(url).json()
    
    if 'access_token' not in response:
        print(f"❌ Twitch API Error: {response}")
        return None
        
    return response.get('access_token')

def check_forsen_status(token):
    headers = {
        'Client-ID': CLIENT_ID,
        'Authorization': f'Bearer {token}'
    }
    url = f'https://api.twitch.tv/helix/streams?user_login={BROADCASTER_LOGIN}'
    response = requests.get(url, headers=headers).json()
    
    data = response.get('data')
    
    if not data:
        print("🔴 Forsen is currently offline.")
        return
        
    stream = data[0]
    print("🟢 Forsen is LIVE!")
    print(f"Title: {stream.get('title')}")
    print(f"Playing: {stream.get('game_name')}")

if __name__ == "__main__":
    print("Testing Twitch API connection...")
    token = get_app_access_token()
    
    if token:
        print("Successfully authenticated!")
        check_forsen_status(token)