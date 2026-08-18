import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

PROJECT_DIR = r"C:\Users\Owner\.gemini\antigravity\scratch\geumgang-drone-monitor"
DATA_DIR = os.path.join(PROJECT_DIR, "data")

def reset_doowoong_to_initial_state():
    # 1. Update Projects Registry for Doowoong (Initial State: 0 completed)
    with open(os.path.join(DATA_DIR, "projects.json"), "r", encoding="utf-8") as f:
        projects = json.load(f)

    for p in projects:
        if p["id"] == "doowoong":
            p["total_area_sqm"] = 67050
            p["total_budget"] = 19500000
            p["target_workers"] = 58  # Plant 3x6=18 + Bullfrog 2x20=40
            p["target_kg"] = 12000
            p["kpis"] = {
                "total_target_area": 67050,
                "planned_rounds": 26,  # 6 plant days + 20 amphibian days
                "total_budget": 19500000,
                "target_workers": 58
            }

    with open(os.path.join(DATA_DIR, "projects.json"), "w", encoding="utf-8") as f:
        json.dump(projects, f, ensure_ascii=False, indent=2)

    # 2. Reset GeoJSON Zone Progress to 0.0%
    with open(os.path.join(DATA_DIR, "doowoong_zones.geojson"), "r", encoding="utf-8") as f:
        zones = json.load(f)

    for feat in zones["features"]:
        feat["properties"]["completed_area"] = 0
        feat["properties"]["progress_pct"] = 0.0

    with open(os.path.join(DATA_DIR, "doowoong_zones.geojson"), "w", encoding="utf-8") as f:
        json.dump(zones, f, ensure_ascii=False, indent=2)

    # 3. Empty Work Logs for Doowoong
    with open(os.path.join(DATA_DIR, "doowoong_work_logs.json"), "w", encoding="utf-8") as f:
        json.dump([], f, ensure_ascii=False, indent=2)

    # 4. Empty Photos for Doowoong
    with open(os.path.join(DATA_DIR, "doowoong_photos.json"), "w", encoding="utf-8") as f:
        json.dump([], f, ensure_ascii=False, indent=2)

    print("Successfully reset Doowoong wetland to clean initial state (0 completed, 26 planned rounds).")

if __name__ == "__main__":
    reset_doowoong_to_initial_state()
