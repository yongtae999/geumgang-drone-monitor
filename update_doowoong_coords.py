import os
import sys
import json
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

sys.stdout.reconfigure(encoding='utf-8')

PROJECT_DIR = r"C:\Users\Owner\.gemini\antigravity\scratch\geumgang-drone-monitor"
DATA_DIR = os.path.join(PROJECT_DIR, "data")
TEMPLATES_DIR = os.path.join(PROJECT_DIR, "assets", "templates")
os.makedirs(TEMPLATES_DIR, exist_ok=True)

def create_projects_data():
    projects = [
        {
            "id": "cheonnaeri",
            "name": "금강청 천내리습지 생태계교란식물 제거사업",
            "short_name": "천내리습지 (가시박 등)",
            "agency": "금강유역환경청",
            "contractor": "(사)야생생물관리협회 충남지부",
            "location_name": "충청남도 금산군 제원면 천내리습지 일원 (제원대교)",
            "center_coords": [127.5755, 36.1065],
            "zoom": 15.2,
            "pitch": 65,
            "bearing": 115,
            "target_species": "가시박, 환삼덩굴, 돼지풀 등",
            "total_area_sqm": 144806,
            "total_budget": 15000000,
            "target_kg": 18830,
            "target_workers": 45,
            "zones_file": "data/zones.geojson",
            "work_logs_file": "data/work_logs.json",
            "photos_file": "data/photos.json",
            "kpis": {
                "total_target_area": 144806,
                "cum_removed_area": 66000,
                "progress_pct": 45.6,
                "cum_removed_kg": 880,
                "target_kg": 18830,
                "cum_workers": 10,
                "target_workers": 45,
                "total_budget": 15000000,
                "spent_budget": 1294488,
                "budget_pct": 8.6
            },
            "flight_tour": [
                { "lng": 127.5676, "lat": 36.1118, "alt": 220, "pitch": 65, "bearing": 135, "speed": 12.0, "name": "1구간 (A) 제원대교 상류" },
                { "lng": 127.5710, "lat": 36.1090, "alt": 180, "pitch": 60, "bearing": 125, "speed": 14.5, "name": "1구간 (A) 완충 구역" },
                { "lng": 127.5741, "lat": 36.1071, "alt": 150, "pitch": 70, "bearing": 110, "speed": 10.0, "name": "2구간 (B) 천내리습지 진입부" },
                { "lng": 127.5765, "lat": 36.1055, "alt": 130, "pitch": 68, "bearing": 105, "speed": 8.5,  "name": "2구간 (B) 가시박 대군락지 중심" },
                { "lng": 127.5785, "lat": 36.1050, "alt": 140, "pitch": 65, "bearing": 95,  "speed": 9.0,  "name": "2-3구간 경계부" },
                { "lng": 127.5815, "lat": 36.1038, "alt": 160, "pitch": 62, "bearing": 90,  "speed": 11.0, "name": "3구간 (C) 습지 하류부" }
            ]
        },
        {
            "id": "doowoong",
            "name": "2026년 두웅습지 외래생물 실태조사 및 확산방지 용역",
            "short_name": "두웅습지 (미국수련·황소개구리)",
            "agency": "금강유역환경청 자연환경과",
            "contractor": "(사)야생생물관리협회 대전·충남·세종지부",
            "location_name": "충청남도 태안군 원북면 신두리 1414-8 (두웅습지보호지역)",
            "center_coords": [126.1958, 36.8278],
            "zoom": 16.8,
            "pitch": 62,
            "bearing": 35,
            "target_species": "미국수련, 마름, 황소개구리 (금개구리 보호)",
            "total_area_sqm": 67050,
            "total_budget": 19500000,
            "target_kg": 12000,
            "target_workers": 35,
            "zones_file": "data/doowoong_zones.geojson",
            "work_logs_file": "data/doowoong_work_logs.json",
            "photos_file": "data/doowoong_photos.json",
            "kpis": {
                "total_target_area": 67050,
                "cum_removed_area": 24500,
                "progress_pct": 36.5,
                "cum_removed_kg": 3450,
                "target_kg": 12000,
                "cum_workers": 12,
                "target_workers": 35,
                "total_budget": 19500000,
                "spent_budget": 5240000,
                "budget_pct": 26.9
            },
            "flight_tour": [
                { "lng": 126.1945, "lat": 36.8268, "alt": 140, "pitch": 60, "bearing": 35, "speed": 8.0, "name": "두웅습지 남측 생태안내소 상공 진입" },
                { "lng": 126.1955, "lat": 36.8276, "alt": 95,  "pitch": 68, "bearing": 45, "speed": 6.5, "name": "1구간 개방수면부 미국수련 군락지" },
                { "lng": 126.1962, "lat": 36.8282, "alt": 90,  "pitch": 70, "bearing": 55, "speed": 6.0, "name": "2구간 수변 갈대습지 및 황소개구리 포획통발 구역" },
                { "lng": 126.1968, "lat": 36.8288, "alt": 120, "pitch": 65, "bearing": 60, "speed": 7.5, "name": "3구간 신두리 해안사구 배후 완충지대 (금개구리 보호)" },
                { "lng": 126.1958, "lat": 36.8278, "alt": 190, "pitch": 55, "bearing": 20, "speed": 10.0, "name": "두웅습지 람사르보호지역 6.7만㎡ 전체 부감" }
            ]
        }
    ]

    with open(os.path.join(DATA_DIR, "projects.json"), "w", encoding="utf-8") as out:
        json.dump(projects, out, ensure_ascii=False, indent=2)
    print("Updated projects.json with precise coordinates.")

def create_doowoong_geojson():
    # Duung Ramsar Wetland (Taean-gun Wonbuk-myeon Sindu-ri 1414-8)
    # Exact center: 36.8278 N, 126.1958 E
    zones = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "id": "zone-1",
                    "name": "1구간 (수생식물 제거구역)",
                    "subname": "두웅습지 중심 수면부",
                    "area_sqm": 18500,
                    "target_species": ["미국수련", "마름"],
                    "density": "수면 피도 65%",
                    "priority": "지하경 굴취 제거",
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
                    "name": "2구간 (양서류 포획구역)",
                    "subname": "수변 갈대·데크 탐방로 주변",
                    "area_sqm": 26500,
                    "target_species": ["황소개구리(성체·유생·난괴)", "마름"],
                    "density": "포획통발 15개소 가동",
                    "priority": "성체·난괴 집중 수거",
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
                    "name": "3구간 (보호종 완충구역)",
                    "subname": "신두리 사구 배후 금개구리 서식지",
                    "area_sqm": 22050,
                    "target_species": ["금개구리(Ⅱ급 보호)"],
                    "density": "혼획방지 정밀 모니터링",
                    "priority": "생태계 훼손 방지",
                    "color": "#10b981",
                    "completed_area": 0,
                    "progress_pct": 0.0
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
    print("Updated doowoong_zones.geojson with precise coordinates.")

def create_doowoong_photos():
    photos = [
        {
            "filename": "doowoong_waterlily_01.jpg",
            "rel_url": "assets/photos/P20260724_071637304_7032984A-8E2E-4A03-BE13-F779D2184C4A.JPG",
            "folder": "두웅습지260812",
            "date_group": "2026-08-12",
            "lat": 36.8276,
            "lng": 126.1955,
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
            "lat": 36.8282,
            "lng": 126.1965,
            "altitude": 26.0,
            "bearing": 65.0,
            "timestamp": "2026:08:14 09:15:20",
            "stage": "황소개구리 포획통발 설치"
        }
    ]
    with open(os.path.join(DATA_DIR, "doowoong_photos.json"), "w", encoding="utf-8") as out:
        json.dump(photos, out, ensure_ascii=False, indent=2)
    print("Updated doowoong_photos.json with precise coordinates.")

if __name__ == "__main__":
    create_projects_data()
    create_doowoong_geojson()
    create_doowoong_photos()
