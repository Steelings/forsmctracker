import os
import requests
import time
import subprocess
from datetime import datetime, timedelta
from dotenv import load_dotenv

# load twitch api with creds
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, '..', '.env')
load_dotenv(env_path)

CLIENT_ID = os.getenv('TWITCH_CLIENT_ID')
CLIENT_SECRET = os.getenv('TWITCH_CLIENT_SECRET')
BROADCASTER_LOGIN = 'forsen'

# check if forsen is live using my own twitch api
def get_app_access_token():
    url = f'https://id.twitch.tv/oauth2/token?client_id={CLIENT_ID}&client_secret={CLIENT_SECRET}&grant_type=client_credentials'
    return requests.post(url).json().get('access_token')

def get_stream_info(token):
    headers = {'Client-ID': CLIENT_ID, 'Authorization': f'Bearer {token}'}
    url = f'https://api.twitch.tv/helix/streams?user_login={BROADCASTER_LOGIN}'
    data = requests.get(url, headers=headers).json().get('data')
    return data[0] if data else None

def get_latest_vod(token, user_id):
    headers = {'Client-ID': CLIENT_ID, 'Authorization': f'Bearer {token}'}
    url = f'https://api.twitch.tv/helix/videos?user_id={user_id}&sort=time&type=archive'
    data = requests.get(url, headers=headers).json().get('data')
    return data[0] if data else None

def calculate_timestamp(stream_start_str, current_time):
    stream_start = datetime.strptime(stream_start_str, "%Y-%m-%dT%H:%M:%SZ")
    diff = current_time - stream_start
    hours, remainder = divmod(diff.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

# workflow - deep sleep until forsen goes live - + 4:00 PM and when forsen goes offline - + 10 PM, making sure to ignore los linkos LULE
def trigger_processing(vod_url, start_timestamp, vod_date):
    print(f"\nSTARTING WORKFLOW FOR {vod_date} ")
    print(f"VOD: {vod_url} | Start Time: {start_timestamp}")
    
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    env["VOD_URL"] = vod_url
    env["START_TIMESTAMP"] = start_timestamp
    env["VOD_DATE"] = vod_date

    root_dir = os.path.join(current_dir, '..')
    
    # python scripts to extract minecraft data from current vod
    print("Running run.py...")
    subprocess.run(["python", "python/run.py"], env=env, cwd=root_dir)
    print("Running merge_outputs.py...")
    subprocess.run(["python", "python/merge_outputs.py"], cwd=root_dir)
    print("Running patch_run.py...")
    subprocess.run(["python", "python/patch_run.py"], cwd=root_dir)
    
    print("Local processing complete!")

    # git auto push to front-end
    print("Committing and pushing to GitHub...")
    try:
        subprocess.run(["git", "add", "data/"], cwd=root_dir, check=True)
        subprocess.run(["git", "commit", "-m", f"Auto-update: VOD data for {vod_date}"], cwd=root_dir, check=True)
        subprocess.run(["git", "push"], cwd=root_dir, check=True)
        print("Data successfully pushed to GitHub! The frontend will now update.")
    except subprocess.CalledProcessError as e:
        print(f"Git push failed: {e}")

# deep sleep function
def is_in_expected_stream_window():
    """Returns True if the current local time is between 15:50 and 22:15 ."""
    now = datetime.now()
    
    # convert time to total minutes
    current_minutes = now.hour * 60 + now.minute
    start_minutes = 15 * 60 + 50  # 950 (15:50)
    end_minutes = 22 * 60 + 15    # 1335 (22:15)
    
    return start_minutes <= current_minutes <= end_minutes

def get_seconds_until_next_shift():
    """Calculates the exact number of seconds until the next 15:50"""
    now = datetime.now()
    target = now.replace(hour=15, minute=50, second=0, microsecond=0)
    
    # go out of sleep time the next day
    if now >= target:
        target += timedelta(days=1)
        
    return (target - now).total_seconds()

# daemon
def main():
    print("Starting Forsen Tracker...")
    
    is_playing_mc = False
    mc_start_time_str = None
    forsen_user_id = None
    
    while True:
        if not is_in_expected_stream_window() and not is_playing_mc:
            sleep_sec = get_seconds_until_next_shift()
            hours, remainder = divmod(sleep_sec, 3600)
            minutes, _ = divmod(remainder, 60)
            
            print(f"[{datetime.now().strftime('%H:%M')}] Outside stream hours. Deep sleeping for {int(hours)}h {int(minutes)}m until 15:50...")
            time.sleep(sleep_sec)
            print(f"[{datetime.now().strftime('%H:%M')}] wake up detected - Starting API polling...")
            continue

        # polling logic
        token = get_app_access_token()
        if not token:
            print("Token error. Retrying in 2 mins...")
            time.sleep(120)
            continue
            
        stream = get_stream_info(token)
        
        if stream:
            forsen_user_id = stream.get('user_id')
            current_game = stream.get('game_name')
            
            # minecraft logic - only start rendering vods when its on mc category
            if current_game == 'Minecraft' and not is_playing_mc:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] mc detected")
                is_playing_mc = True
                mc_start_time_str = calculate_timestamp(stream.get('started_at'), datetime.utcnow())
                print(f"Calculated VOD Start Timestamp: {mc_start_time_str}")
                
            elif current_game != 'Minecraft' and is_playing_mc:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Forsen stopped playing Minecraft (Switched to {current_game}).")
                is_playing_mc = False
                
                vod_info = get_latest_vod(token, forsen_user_id)
                if vod_info:
                    vod_date = datetime.now().strftime("%b %d") 
                    trigger_processing(vod_info.get('url'), mc_start_time_str, vod_date)
                else:
                    print("Could not find the VOD URL!")
                    
            elif is_playing_mc:
                pass
                
        else:
            if is_playing_mc:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Stream ended while playing Minecraft.")
                is_playing_mc = False
                
                if forsen_user_id:
                    print("Fetching VOD for idiotasen to not swap category when going offline")
                    vod_info = get_latest_vod(token, forsen_user_id)
                    if vod_info:
                        vod_date = datetime.now().strftime("%b %d") 
                        trigger_processing(vod_info.get('url'), mc_start_time_str, vod_date)
                    else:
                        print("Could not find the VOD URL!")
                
        # 2 min sleep and poll again
        time.sleep(120)

if __name__ == "__main__":
    main()