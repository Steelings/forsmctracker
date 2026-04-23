import json
import os

files_to_fix = [
    "data/raw/output_apr23.json", 
    "data/raw/output_apr23_023316.json"
]

for filepath in files_to_fix:
    if not os.path.exists(filepath):
        continue
        
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    valid_data = []
    vod_url = ""
    date_str = "Apr 23" # Default

    for line in lines:
        # Clean trailing commas and whitespace
        clean_line = line.strip().rstrip(',')
        
        # Extract the VOD URL
        if '"vod": "' in clean_line and not vod_url:
            try:
                vod_url = clean_line.split('"vod": "')[1].split('"')[0]
            except:
                pass
                
        # Extract the Date
        if '"date": "' in clean_line:
            try:
                date_str = clean_line.split('"date": "')[1].split('"')[0]
            except:
                pass

        # ONLY grab lines that are actual frame data
        if clean_line.startswith('{"timestamp"'):
            try:
                # Parse it to guarantee it is valid JSON
                valid_data.append(json.loads(clean_line))
            except:
                pass # Silently ignore any hopelessly mangled frames

    # Rebuild the perfect JSON structure
    final_json = {
        "date": date_str,
        "vod": vod_url,
        "data": valid_data
    }

    # Overwrite the file with the clean, perfectly formatted JSON
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(final_json, f, separators=(',', ':'))
        
    print(f"✅ Nuked and rebuilt: {filepath}")