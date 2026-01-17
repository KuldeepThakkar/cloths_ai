import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import asyncio
import base64
import sys
import os
from ultralytics import YOLO

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ai_models.skin_tone import SkinToneExtractor

app = FastAPI()

# Initialize YOLOv8-Pose (Nano version)
# Will download yolov8n-pose.pt automatically on first run
yolo_model = YOLO('yolov8n-pose.pt')
skin_extractor = SkinToneExtractor()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Expanded Mock Clothing Dataset
CLOTHES_DATA = [
    {"id": 1, "name": "Classic White Shirt", "category": "Formal", "color": "#ffffff", "price": 2500, "skin_tone_match": ["Any"]},
    {"id": 2, "name": "Navy Blue Blazer", "category": "Formal", "color": "#000080", "price": 8500, "skin_tone_match": ["Fair", "Wheatish"]},
    {"id": 3, "name": "Casual Denim Shirt", "category": "Casual", "color": "#5b7c99", "price": 1800, "skin_tone_match": ["Any"]},
    {"id": 4, "name": "Traditional Kurta", "category": "Ethnic", "color": "#d4af37", "price": 3500, "skin_tone_match": ["Dusky", "Deep", "Wheatish"]},
    {"id": 5, "name": "Black Polo T-Shirt", "category": "Casual", "color": "#000000", "price": 1200, "skin_tone_match": ["Any"]},
    {"id": 6, "name": "Olive Green Bomber", "category": "Casual", "color": "#556b2f", "price": 4500, "skin_tone_match": ["Wheatish", "Dusky"]},
    {"id": 7, "name": "Charcoal Grey Trousers", "category": "Formal", "color": "#36454f", "price": 3200, "skin_tone_match": ["Any"]},
    {"id": 8, "name": "Silk Sherwani", "category": "Ethnic", "color": "#800000", "price": 12000, "skin_tone_match": ["Dusky", "Wheatish"]},
    {"id": 9, "name": "Linen Summer Shirt", "category": "Casual", "color": "#f5f5dc", "price": 2200, "skin_tone_match": ["Fair", "Wheatish"]},
    {"id": 10, "name": "Suede Chelsea Boots", "category": "Formal", "color": "#8b4513", "price": 6000, "skin_tone_match": ["Any"]},
]

@app.get("/")
async def root():
    return {"message": "FashionVision AI YOLO-Pose Backend is Running"}

@app.get("/recommend")
async def get_recommendations(skin_tone: str = "Wheatish", body_type: str = "Ectomorph", category: str = "All", prompt: str = ""):
    filtered = []
    suggested_colors = skin_extractor.get_color_recommendation(skin_tone)
    
    # Simple search keywords
    search_keywords = prompt.lower().split() if prompt else []
    
    for item in CLOTHES_DATA:
        # Category Filter
        if category != "All" and item["category"] != category:
            continue
            
        # Skin Tone Match
        tone_match = "Any" in item["skin_tone_match"] or skin_tone in item["skin_tone_match"]
        
        # Keyword search (optional)
        prompt_match = True
        if search_keywords:
            item_text = f"{item['name']} {item['category']} {item['color']}".lower()
            prompt_match = any(word in item_text for word in search_keywords)
            
        if tone_match and prompt_match:
            filtered.append(item)
            
    return {
        "recommendations": filtered, 
        "suggested_colors": suggested_colors,
        "body_advice": f"Tailored fits showcase your {body_type} build."
    }

class YOLOProcessor:
    def process_frame(self, frame):
        # AI Inference
        results = yolo_model(frame, verbose=False)[0]
        
        if not results.keypoints or len(results.keypoints.xy) == 0:
            return None, None, None

        # Extract Keypoints (xy normalized to pixels)
        kpts = results.keypoints.xy[0].cpu().numpy()
        
        # YOLOv8-Pose Mapping: 0:Nose, 5:L-Shoulder, 6:R-Shoulder, 11:L-Hip, 12:R-Hip
        # MediaPipe compat mapping for frontend HUD: 11:LS, 12:RS, 23:LH, 24:RH
        mapped_landmarks = []
        if len(kpts) > 12:
            # Map essential points for HUD rendering and skin extraction
            # Nose MUST be first (index 0) for compat with skin_tone.py:extract_skin_color
            mapped_landmarks = [
                [0, float(kpts[0][0]), float(kpts[0][1]), 0],   # Nose
                [11, float(kpts[5][0]), float(kpts[5][1]), 0], # L-Shoulder (MediaPipe 11)
                [12, float(kpts[6][0]), float(kpts[6][1]), 0], # R-Shoulder (MediaPipe 12)
                [23, float(kpts[11][0]), float(kpts[11][1]), 0], # L-Hip (MediaPipe 23)
                [24, float(kpts[12][0]), float(kpts[12][1]), 0], # R-Hip (MediaPipe 24)
            ]

        # Calculate Metrics (as per user snippet)
        s_width = np.linalg.norm(kpts[5] - kpts[6])
        w_width = np.linalg.norm(kpts[11] - kpts[12])
        ratio = s_width / w_width if w_width > 0 else 1.0
        
        structure = "Mesomorph" if ratio > 1.15 else "Ectomorph"
        
        metrics = {
            "body_type": structure,
            "ratio": round(float(ratio), 2),
            "height": "167 cm",
            "shoulder_width": int(s_width),
            "waist_width": int(w_width),
            "vibe_match": "99.2%"
        }

        # Skin Tone Extraction
        skin_tone = "Wheatish"
        skin_roi = None
        if len(kpts) > 0:
            rgb, skin_roi = skin_extractor.extract_skin_color(frame, mapped_landmarks)
            skin_tone = skin_extractor.map_to_palette(rgb)

        return metrics, skin_tone, mapped_landmarks, skin_roi

processor = YOLOProcessor()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            if data.startswith('data:image'):
                img_data = base64.b64decode(data.split(',')[1])
                nparr = np.frombuffer(img_data, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                metrics, skin_tone, landmarks, skin_roi = processor.process_frame(frame)
                
                if metrics:
                    await websocket.send_json({
                        "status": "success",
                        "metrics": metrics,
                        "skin_tone": skin_tone,
                        "landmarks": landmarks,
                        "skin_roi": skin_roi
                    })
                else:
                    await websocket.send_json({
                        "status": "searching",
                        "message": "Position yourself in frame"
                    })
            else:
                await websocket.send_json({"status": "error", "message": "Invalid frame format"})
    except WebSocketDisconnect:
        print("Client disconnected")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
