import os
import sys
import json
import urllib.parse
import mimetypes
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

PORT = 8088
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

class DroneMonitoringHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # API: Data
        if path == '/api/data':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            
            # Load data files
            photos = []
            work_logs = []
            zones = {}
            
            photos_path = os.path.join(DATA_DIR, "photos.json")
            work_logs_path = os.path.join(DATA_DIR, "work_logs.json")
            zones_path = os.path.join(DATA_DIR, "zones.geojson")
            
            if os.path.exists(photos_path):
                with open(photos_path, 'r', encoding='utf-8') as f:
                    photos = json.load(f)
            if os.path.exists(work_logs_path):
                with open(work_logs_path, 'r', encoding='utf-8') as f:
                    work_logs = json.load(f)
            if os.path.exists(zones_path):
                with open(zones_path, 'r', encoding='utf-8') as f:
                    zones = json.load(f)
                    
            # Compute KPI Summary
            total_target_area = 144806 # sqm (28836 + 72803 + 43167)
            completed_logs = [w for w in work_logs if w.get('is_completed', False)]
            cum_removed_area = sum(w.get('area_sqm', 0) for w in completed_logs)
            cum_removed_kg = sum(w.get('amount_kg', 0) for w in completed_logs)
            cum_workers = sum(w.get('workers', 5) for w in completed_logs)
            
            # If default sample
            if cum_removed_area == 0:
                cum_removed_area = 66000
                cum_removed_kg = 880
                cum_workers = 10
                
            response_data = {
                "zones": zones,
                "work_logs": work_logs,
                "photos": photos,
                "kpis": {
                    "total_target_area": total_target_area,
                    "cum_removed_area": cum_removed_area,
                    "progress_pct": round((cum_removed_area / total_target_area) * 100, 1),
                    "cum_removed_kg": cum_removed_kg,
                    "target_kg": 18830,
                    "cum_workers": cum_workers,
                    "target_workers": 45,
                    "total_budget": 15000000,
                    "spent_budget": 1294488,
                    "budget_pct": round((1294488 / 15000000) * 100, 1)
                }
            }
            
            self.wfile.write(json.dumps(response_data, ensure_ascii=False).encode('utf-8'))
            return

        # API: Photo Stream
        elif path == '/api/photo':
            photo_path = query.get('path', [None])[0]
            if not photo_path or not os.path.exists(photo_path):
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b"Photo Not Found")
                return
                
            mime_type, _ = mimetypes.guess_type(photo_path)
            self.send_response(200)
            self.send_header('Content-Type', mime_type or 'image/jpeg')
            self.send_header('Cache-Control', 'max-age=86400')
            self.end_headers()
            
            with open(photo_path, 'rb') as f:
                self.wfile.write(f.read())
            return

        # Static Files
        else:
            rel_file = path.lstrip('/') or 'index.html'
            file_path = os.path.join(BASE_DIR, rel_file)
            
            if os.path.exists(file_path) and os.path.isfile(file_path):
                mime_type, _ = mimetypes.guess_type(file_path)
                self.send_response(200)
                self.send_header('Content-Type', mime_type or 'application/octet-stream')
                self.end_headers()
                with open(file_path, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b"404 Not Found")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        
        if path == '/api/work-logs':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                new_entry = json.loads(body)
                work_logs_path = os.path.join(DATA_DIR, "work_logs.json")
                logs = []
                if os.path.exists(work_logs_path):
                    with open(work_logs_path, 'r', encoding='utf-8') as f:
                        logs = json.load(f)
                
                # Check if updating or adding
                existing_idx = next((i for i, item in enumerate(logs) if item.get('id') == new_entry.get('id')), -1)
                if existing_idx >= 0:
                    logs[existing_idx] = new_entry
                else:
                    new_entry['id'] = len(logs) + 1
                    logs.append(new_entry)
                    
                with open(work_logs_path, 'w', encoding='utf-8') as f:
                    json.dump(logs, f, ensure_ascii=False, indent=2)
                    
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "data": new_entry}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return
        else:
            self.send_response(404)
            self.end_headers()

def run(port=PORT):
    server_address = ('', port)
    httpd = HTTPServer(server_address, DroneMonitoringHandler)
    print(f"============================================================")
    print(f"🛸 Geumgang Cheonnae-ri Drone Monitoring Platform is running!")
    print(f"👉 Local URL: http://localhost:{port}")
    print(f"============================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()

if __name__ == '__main__':
    run()
