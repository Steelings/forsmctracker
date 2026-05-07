import json

file_path = "data/stripped_runs.json"

try:
    print(f"Loading {file_path}...")
    with open(file_path, "r", encoding="utf-8") as f:
        runs = json.load(f)

    updated = False
    target_run = None

    for run in runs:
        if run.get("date") == "May 06":
            target_run = run
            
    if target_run:
        old_time = target_run.get("runTime", "Unknown")
        target_run["runTime"] = "14:18.375"
        target_run["finish"] = 858.375
        updated = True
        print(f"Record run found! Old time was {old_time}. Updated to 14:18.375!")

    if updated:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(runs, f, separators=(',', ':'))
        print("Done!")
    else:
        print("Could not find a run on May 06. Check the date/data!")

except Exception as e:
    print(f"An error occurred: {e}")