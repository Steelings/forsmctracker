import json

file_path = "data/stripped_runs.json"

try:
    print(f"Loading {file_path}...")
    with open(file_path, "r", encoding="utf-8") as f:
        runs = json.load(f)

    updated = False

    for run in runs:
        if run.get("date") == "Apr 18" and run.get("end") is not None:
            run["runTime"] = "16:59.561"
            run["finish"] = 1019.561 
            updated = True
            print(f"Run found! Old time was {run.get('runTime')}. Updated to 16:59.561!")
            break

    if updated:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(runs, f, separators=(',', ':'))
        print("Done!")
    else:
        print("Could not find a run on Apr 18 with an 'end' split. Check the date/data!")

except Exception as e:
    print(f"An error occurred: {e}")