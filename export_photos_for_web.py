import os
import sys
import json
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

sys.stdout.reconfigure(encoding='utf-8')

PROJECT_DIR = r"C:\Users\Owner\.gemini\antigravity\scratch\geumgang-drone-monitor"
DATA_DIR = os.path.join(PROJECT_DIR, "data")
ASSETS_PHOTO_DIR = os.path.join(PROJECT_DIR, "assets", "photos")
os.makedirs(ASSETS_PHOTO_DIR, exist_ok=True)

PHOTO_SRC_BASE = r"E:\0. 2026년\2. 금강청 천내리\사진"

def dms_to_deg(dms, ref):
    if not dms:
        return None
    d, m, s = [float(x) for x in dms]
    deg = d + m / 60.0 + s / 3600.0
    if ref in ['S', 'W']:
        deg = -deg
    return round(deg, 7)

def optimize_and_export_photos():
    photos = []
    supported_ext = ('.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG')
    
    count = 0
    for root, _, files in os.walk(PHOTO_SRC_BASE):
        for f in files:
            if f.endswith(supported_ext):
                count += 1
                src_path = os.path.join(root, f)
                dst_path = os.path.join(ASSETS_PHOTO_DIR, f)
                date_folder = "2026-07-24" if "260724" in root else ("2026-08-06" if "260806" in root else "2026-07-10")
                
                photo_info = {
                    "filename": f,
                    "rel_url": f"assets/photos/{f}",
                    "folder": os.path.basename(root),
                    "date_group": date_folder,
                    "lat": None,
                    "lng": None,
                    "altitude": None,
                    "bearing": None,
                    "timestamp": None,
                    "stage": "작업 중"
                }
                
                try:
                    with Image.open(src_path) as img:
                        exif = img._getexif()
                        if exif:
                            gps_info = {}
                            date_str = None
                            for k, v in exif.items():
                                tag = TAGS.get(k, k)
                                if tag in ['DateTimeOriginal', 'DateTime']:
                                    date_str = str(v)
                                elif tag == 'GPSInfo':
                                    for gk, gv in v.items():
                                        gtag = GPSTAGS.get(gk, gk)
                                        gps_info[gtag] = gv
                            
                            if date_str:
                                photo_info["timestamp"] = date_str
                            
                            if gps_info:
                                lat_dms = gps_info.get('GPSLatitude')
                                lat_ref = gps_info.get('GPSLatitudeRef', 'N')
                                lng_dms = gps_info.get('GPSLongitude')
                                lng_ref = gps_info.get('GPSLongitudeRef', 'E')
                                
                                if lat_dms and lng_dms:
                                    photo_info["lat"] = dms_to_deg(lat_dms, lat_ref)
                                    photo_info["lng"] = dms_to_deg(lng_dms, lng_ref)
                                
                                alt = gps_info.get('GPSAltitude')
                                if alt:
                                    photo_info["altitude"] = round(float(alt), 1)
                                
                                bearing = gps_info.get('GPSImgDirection') or gps_info.get('GPSDestBearing')
                                if bearing:
                                    photo_info["bearing"] = round(float(bearing), 1)
                        
                        # Resize & compress for web hosting
                        img_rgb = img.convert('RGB')
                        max_dim = 1600
                        if max(img_rgb.size) > max_dim:
                            img_rgb.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
                        img_rgb.save(dst_path, 'JPEG', quality=82, optimize=True)
                except Exception as e:
                    print(f"Error processing {f}: {e}")
                
                photos.append(photo_info)

    print(f"Successfully optimized and exported {len(photos)} photos to assets/photos.")
    with open(os.path.join(DATA_DIR, "photos.json"), "w", encoding="utf-8") as out:
        json.dump(photos, out, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    optimize_and_export_photos()
