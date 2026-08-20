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

def optimize_and_export_photos(max_photos_per_round=5):
    supported_ext = ('.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG')
    all_raw = {}
    
    # 1. Collect all raw photos
    for root, _, files in os.walk(PHOTO_SRC_BASE):
        for f in sorted(files):
            if f.endswith(supported_ext):
                src_path = os.path.join(root, f)
                if "260820" in root:
                    date_folder = "2026-08-20"
                elif "260806" in root:
                    date_folder = "2026-08-06"
                elif "260724" in root:
                    date_folder = "2026-07-24"
                else:
                    date_folder = "2026-07-10"
                
                photo_info = {
                    "filename": f,
                    "rel_url": f"assets/photos/{f}",
                    "folder": os.path.basename(root),
                    "date_group": date_folder,
                    "src_path": src_path,
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
                except Exception as e:
                    pass
                
                all_raw.setdefault(date_folder, []).append(photo_info)

    # 2. Select at most 5 representative photos per round
    selected_photos = []
    kept_filenames = set()

    for dg in sorted(all_raw.keys()):
        plist = all_raw[dg]
        plist.sort(key=lambda x: x.get('timestamp') or x['filename'])
        
        # GPS valid photos preferred
        with_gps = [p for p in plist if p['lat'] and p['lng']]
        candidates = with_gps if len(with_gps) >= max_photos_per_round else plist
        n = len(candidates)

        if n <= max_photos_per_round:
            chosen = candidates
        else:
            # Pick 5 evenly spaced indices
            step = (n - 1) / float(max_photos_per_round - 1)
            indices = [int(round(i * step)) for i in range(max_photos_per_round)]
            seen_idx = set()
            chosen = []
            for idx in indices:
                if idx not in seen_idx and idx < n:
                    chosen.append(candidates[idx])
                    seen_idx.add(idx)
            for c in candidates:
                if len(chosen) >= max_photos_per_round:
                    break
                if c not in chosen:
                    chosen.append(c)

        # Assign stage: 1 before, 3 during, 1 after
        if len(chosen) >= 3:
            chosen[0]['stage'] = '작업 전'
            for p in chosen[1:-1]:
                p['stage'] = '작업 중'
            chosen[-1]['stage'] = '작업 후'

        for p in chosen:
            kept_filenames.add(p['filename'])
            dst_path = os.path.join(ASSETS_PHOTO_DIR, p['filename'])
            try:
                with Image.open(p['src_path']) as img:
                    img_rgb = img.convert('RGB')
                    max_dim = 1200
                    if max(img_rgb.size) > max_dim:
                        img_rgb.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
                    img_rgb.save(dst_path, 'JPEG', quality=80, optimize=True)
            except Exception as e:
                print(f"Error saving {p['filename']}: {e}")

            clean_info = {k: v for k, v in p.items() if k != 'src_path'}
            selected_photos.append(clean_info)

    # 3. Remove unselected old photos to keep repo ultra-lightweight
    removed_count = 0
    for f in os.listdir(ASSETS_PHOTO_DIR):
        if f not in kept_filenames and f.lower().endswith(supported_ext):
            try:
                os.remove(os.path.join(ASSETS_PHOTO_DIR, f))
                removed_count += 1
            except Exception:
                pass

    print(f"Kept {len(selected_photos)} representative photos (<= {max_photos_per_round} per round). Removed {removed_count} unselected files.")
    
    with open(os.path.join(DATA_DIR, "photos.json"), "w", encoding="utf-8") as out:
        json.dump(selected_photos, out, ensure_ascii=False, indent=2)

    total_size = sum(os.path.getsize(os.path.join(ASSETS_PHOTO_DIR, f)) for f in os.listdir(ASSETS_PHOTO_DIR))
    print(f"Total photos directory size: {total_size/1024/1024:.2f} MB")

if __name__ == "__main__":
    optimize_and_export_photos(5)
