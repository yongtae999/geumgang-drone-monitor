import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

PROJECT_DIR = r"C:\Users\Owner\.gemini\antigravity\scratch\geumgang-drone-monitor"
DATA_DIR = os.path.join(PROJECT_DIR, "data")

def update_doowoong_data():
    # 1. Update Projects Registry
    with open(os.path.join(DATA_DIR, "projects.json"), "r", encoding="utf-8") as f:
        projects = json.load(f)

    for p in projects:
        if p["id"] == "doowoong":
            p["flight_tour"] = [
                { "lng": 126.1945, "lat": 36.8268, "alt": 140, "pitch": 60, "bearing": 35, "speed": 8.0, "name": "두웅습지 남측 생태안내소 상공 진입" },
                { "lng": 126.1955, "lat": 36.8276, "alt": 95,  "pitch": 68, "bearing": 45, "speed": 6.5, "name": "미국수련 제거구역 (개방수면부)" },
                { "lng": 126.1962, "lat": 36.8282, "alt": 90,  "pitch": 70, "bearing": 55, "speed": 6.0, "name": "황소개구리 포획구역 (수변 통발 15개소)" },
                { "lng": 126.1968, "lat": 36.8288, "alt": 120, "pitch": 65, "bearing": 60, "speed": 7.5, "name": "기타 정비구역 (탐방데크 및 완충지대)" },
                { "lng": 126.1958, "lat": 36.8278, "alt": 190, "pitch": 55, "bearing": 20, "speed": 10.0, "name": "두웅습지 람사르보호지역 6.7만㎡ 전체 부감" }
            ]
            p["button_labels"] = {
                "tour": "습지 자율 순회 비행",
                "overview": "두웅습지 전체 부감",
                "zone-1": "미국수련 제거구역",
                "zone-1-sub": "개방수면부 18,500㎡",
                "zone-2": "황소개구리 포획구역",
                "zone-2-sub": "수변 갈대습지 26,500㎡",
                "zone-3": "기타 정비구역",
                "zone-3-sub": "데크변·완충지 22,050㎡"
            }

    with open(os.path.join(DATA_DIR, "projects.json"), "w", encoding="utf-8") as f:
        json.dump(projects, f, ensure_ascii=False, indent=2)

    # 2. Update GeoJSON Zones
    zones = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "id": "zone-1",
                    "name": "미국수련 제거구역",
                    "subname": "두웅습지 개방수면부",
                    "area_sqm": 18500,
                    "target_species": ["미국수련", "마름"],
                    "density": "수면 피도 65%",
                    "priority": "지하경(뿌리줄기) 집중 굴취",
                    "color": "#38bdf8",
                    "completed_area": 12000,
                    "progress_pct": 64.9
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [126.1950, 36.8272],
                        [126.1962, 36.8274],
                        [126.1966, 36.8282],
                        [126.1958, 36.8286],
                        [126.1948, 36.8280],
                        [126.1950, 36.8272]
                    ]]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "id": "zone-2",
                    "name": "황소개구리 포획구역",
                    "subname": "수변 갈대·부들 군락지",
                    "area_sqm": 26500,
                    "target_species": ["황소개구리(성체·유생·난괴)"],
                    "density": "포획통발 15개소 설치 가동",
                    "priority": "성체·난괴 집중 수거 (금개구리 혼획방지)",
                    "color": "#ef4444",
                    "completed_area": 12500,
                    "progress_pct": 47.2
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [126.1944, 36.8268],
                        [126.1966, 36.8270],
                        [126.1972, 36.8285],
                        [126.1965, 36.8292],
                        [126.1948, 36.8288],
                        [126.1940, 36.8276],
                        [126.1944, 36.8268]
                    ]]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "id": "zone-3",
                    "name": "기타 정비구역",
                    "subname": "탐방로 데크변 및 완충지대",
                    "area_sqm": 22050,
                    "target_species": ["고사목·수생 잔재물 정리", "금개구리 보호"],
                    "density": "환경정비 및 안내판 관리",
                    "priority": "생태계 환경 정비 및 피복 처리",
                    "color": "#10b981",
                    "completed_area": 6500,
                    "progress_pct": 29.5
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [126.1938, 36.8262],
                        [126.1972, 36.8264],
                        [126.1980, 36.8288],
                        [126.1972, 36.8298],
                        [126.1942, 36.8295],
                        [126.1932, 36.8278],
                        [126.1938, 36.8262]
                    ]]
                }
            }
        ]
    }

    with open(os.path.join(DATA_DIR, "doowoong_zones.geojson"), "w", encoding="utf-8") as out:
        json.dump(zones, out, ensure_ascii=False, indent=2)

    # 3. Update Work Logs with new zone names
    logs = [
        {
            "id": 1,
            "target_plant": "미국수련 (지하경), 마름",
            "location": "충남 태안군 두웅습지 개방수면부",
            "zone": "미국수련 제거구역",
            "work_date": "2026-08-12",
            "is_completed": True,
            "method": "수거망 사용, 지하경 굴취 육상반출",
            "stages": ["영양생장", "개화"],
            "area_sqm": 1200,
            "hours": 6,
            "amount_kg": 1800,
            "workers": 5
        },
        {
            "id": 2,
            "target_plant": "황소개구리 (성체 58마리, 유생)",
            "location": "두웅습지 수변 갈대습지 15개소",
            "zone": "황소개구리 포획구역",
            "work_date": "2026-08-14",
            "is_completed": True,
            "method": "포획통발 15개 설치, 투망·뜰채",
            "stages": ["개화/성체", "결실/유생"],
            "area_sqm": 2500,
            "hours": 6,
            "amount_kg": 1650,
            "workers": 4
        },
        {
            "id": 3,
            "target_plant": "수생식물 잔재물 및 고사목",
            "location": "두웅습지 목재데크 탐방로 주변",
            "zone": "기타 정비구역",
            "work_date": "2026-08-20 (예정)",
            "is_completed": False,
            "method": "갈고리 및 잔재물 수거",
            "stages": ["영양생장"],
            "area_sqm": 1500,
            "hours": 6,
            "amount_kg": 800,
            "workers": 5
        }
    ]
    with open(os.path.join(DATA_DIR, "doowoong_work_logs.json"), "w", encoding="utf-8") as out:
        json.dump(logs, out, ensure_ascii=False, indent=2)

    print("Updated Doowoong Wetland with: 미국수련 제거구역, 황소개구리 포획구역, 기타 정비구역")

if __name__ == "__main__":
    update_doowoong_data()
