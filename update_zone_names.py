import json
import os

base_dir = r"C:\Users\Owner\.gemini\antigravity\scratch\geumgang-drone-monitor"

# 1. Update zones.geojson
zones_path = os.path.join(base_dir, "data", "zones.geojson")
with open(zones_path, "r", encoding="utf-8") as f:
    zones = json.load(f)

for feat in zones.get("features", []):
    zid = feat["properties"]["id"]
    if zid == "zone-1":
        feat["properties"]["name"] = "1구간"
        feat["properties"]["subname"] = "상류 제원대교 진입구역 (28,836㎡)"
    elif zid == "zone-2":
        feat["properties"]["name"] = "2구간"
        feat["properties"]["subname"] = "가시박 대군락지 중심부 (72,803㎡)"
    elif zid == "zone-3":
        feat["properties"]["name"] = "3구간"
        feat["properties"]["subname"] = "하류 확산 차단구역 (43,167㎡)"

with open(zones_path, "w", encoding="utf-8") as f:
    json.dump(zones, f, ensure_ascii=False, indent=2)

print("Updated data/zones.geojson to 1구간, 2구간, 3구간!")

# 2. Update projects.json
proj_path = os.path.join(base_dir, "data", "projects.json")
with open(proj_path, "r", encoding="utf-8") as f:
    projs = json.load(f)

for p in projs:
    if p["id"] == "cheonnaeri":
        p["button_labels"] = {
            "tour": "강줄기 순회 비행",
            "overview": "천내리습지 전체 부감",
            "zone-1": "1구간",
            "zone-1-sub": "상류 진입부 28,836㎡",
            "zone-2": "2구간",
            "zone-2-sub": "가시박 대군락 72,803㎡",
            "zone-3": "3구간",
            "zone-3-sub": "하류 차단구역 43,167㎡"
        }
        for ft in p.get("flight_tour", []):
            if "(A)" in ft["name"] or "상류" in ft["name"]:
                ft["name"] = "1구간 제원대교 상류 비행"
            elif "(B)" in ft["name"] or "중심" in ft["name"]:
                ft["name"] = "2구간 가시박 대군락 중심 비행"
            elif "(C)" in ft["name"] or "하류" in ft["name"]:
                ft["name"] = "3구간 습지 하류부 비행"

with open(proj_path, "w", encoding="utf-8") as f:
    json.dump(projs, f, ensure_ascii=False, indent=2)

print("Updated data/projects.json button_labels to 1구간, 2구간, 3구간!")
