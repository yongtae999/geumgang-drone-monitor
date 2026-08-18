import urllib.request
import urllib.parse
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Search Road Address: 충청남도 태안군 원북면 신두해변길 291-30
road_addr = "충청남도 태안군 원북면 신두해변길 291-30"

# OpenStreetMap search with proper encoding
query_url = "https://nominatim.openstreetmap.org/search?format=json&q=" + urllib.parse.quote(road_addr)
req = urllib.request.Request(query_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print("OSM data:", data)
except Exception as e:
    print("OSM error:", e)

# Search using Korean Address Geocoding services
# Let's test standard juso API / Naver / Kakao search
search_query = "태안군 신두해변길 291-30"
url_daum = "https://dapi.kakao.com/v2/local/search/address.json?query=" + urllib.parse.quote(road_addr)
# We can search through open web search if needed
