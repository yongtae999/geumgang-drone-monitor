import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

PROJECT_DIR = r"C:\Users\Owner\.gemini\antigravity\scratch\geumgang-drone-monitor"
DATA_DIR = os.path.join(PROJECT_DIR, "data")

def update_exact_doowoong_address():
    # Exact Address: 충청남도 태안군 원북면 신두해변길 291-30 (두웅습지보호지역)
    # Latitude: 36.835908, Longitude: 126.195757
    lat_center = 36.835908
    lng_center = 126.195757

    # 1. Update Projects Registry
    with open(os.path.join(DATA_DIR, "projects.json"), "r", encoding="utf-8") as f:
        projects = json.load(f)

    for p in projects:
        if p["id"] == "doowoong":
            p["location_name"] = "충청남도 태안군 원북면 신두해변길 291-30 (두웅습지보호지역)"
            p["center_coords"] = [lng_center, lat_center]
            p["zoom"] = 17.0
            p["pitch"] = 62
            p["bearing"] = 35
            p["flight_tour"] = [
                { "lng": 126.1948, "lat": 36.8348, "alt": 140, "pitch": 60, "bearing": 35, "speed": 8.0, "name": "두웅습지 방문자센터 (신두해변길 291-30) 상공" },
                { "lng": 126.1957, "lat": 36.8358, "alt": 95,  "pitch": 68, "bearing": 45, "speed": 6.5, "name": "미국수련 제거구역 (개방수면부)" },
                { "lng": 126.1965, "lat": 36.8364, "alt": 90,  "pitch": 70, "bearing": 55, "speed": 6.0, "name": "황소개구리 포획구역 (수변 통발 15개소)" },
                { "lng": 126.1970, "lat": 36.8370, "alt": 120, "pitch": 65, "bearing": 60, "speed": 7.5, "name": "기타 정비구역 (탐방데크 및 완충지대)" },
                { "lng": 126.1958, "lat": 36.8359, "alt": 190, "pitch": 55, "bearing": 20, "speed": 10.0, "name": "두웅습지 람사르보호지역 6.7만㎡ 전체 부감" }
            ]

    with open(os.path.join(DATA_DIR, "projects.json"), "w", encoding="utf-8") as f:
        json.dump(projects, f, ensure_ascii=False, indent=2)

    # 2. Update GeoJSON Zones around exact coords (36.8359, 126.1958)
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
                        [126.1950, 36.8352],
                        [126.1962, 36.8354],
                        [126.1966, 36.8363],
                        [126.1958, 36.8367],
                        [126.1948, 36.8361],
                        [126.1950, 36.8352]
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
                        [126.1944, 36.8348],
                        [126.1966, 36.8350],
                        [126.1973, 36.8366],
                        [126.1965, 36.8373],
                        [126.1948, 36.8369],
                        [126.1940, 36.8357],
                        [126.1944, 36.8348]
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
                        [126.1938, 36.8342],
                        [126.1972, 36.8344],
                        [126.1981, 36.8369],
                        [126.1973, 36.8379],
                        [126.1942, 36.8376],
                        [126.1932, 36.8359],
                        [126.1938, 36.8342]
                    ]]
                }
            }
        ]
    }

    with open(os.path.join(DATA_DIR, "doowoong_zones.geojson"), "w", encoding="utf-8") as out:
        json.dump(zones, out, ensure_ascii=False, indent=2)

    # 3. Update Photos GPS
    photos = [
        {
            "filename": "doowoong_waterlily_01.jpg",
            "rel_url": "assets/photos/P20260724_071637304_7032984A-8E2E-4A03-BE13-F779D2184C4A.JPG",
            "folder": "두웅습지260812",
            "date_group": "2026-08-12",
            "lat": 36.8358,
            "lng": 126.1957,
            "altitude": 24.5,
            "bearing": 45.0,
            "timestamp": "2026:08:12 08:30:15",
            "stage": "수생식물(미국수련) 제거"
        },
        {
            "filename": "doowoong_bullfrog_trap_02.jpg",
            "rel_url": "assets/photos/P20260806_070026068_9831C9C9-3CC3-435C-BFD7-3228A99122FC.JPG",
            "folder": "두웅습지260814",
            "date_group": "2026-08-14",
            "lat": 36.8364,
            "lng": 126.1965,
            "altitude": 26.0,
            "bearing": 65.0,
            "timestamp": "2026:08:14 09:15:20",
            "stage": "황소개구리 포획통발 설치"
        }
    ]
    with open(os.path.join(DATA_DIR, "doowoong_photos.json"), "w", encoding="utf-8") as out:
        json.dump(photos, out, ensure_ascii=False, indent=2)

    print("Updated Doowoong coordinates to: 36.835908 N, 126.195757 E (신두해변길 291-30)")

if __name__ == "__main__":
    update_exact_doowoong_address()
