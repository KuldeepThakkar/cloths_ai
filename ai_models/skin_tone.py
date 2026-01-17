import cv2
import numpy as np

class SkinToneExtractor:
    def __init__(self):
        # Indian Skin Tone Palette (Approximate RGB/Hex maps)
        self.palette = {
            "Fair": [255, 224, 189],
            "Wheatish": [255, 205, 148],
            "Dusky": [210, 161, 140],
            "Deep": [141, 85, 36]
        }

    def extract_skin_color(self, img, lm_list):
        """
        Extract skin color and ROI bounds for visual feedback.
        """
        if not lm_list or len(lm_list) < 1:
            return None, None

        # Nose landmark is expected at index 0
        nose = lm_list[0]
        h, w, _ = img.shape
        
        # Sample a 20x20 area around the nose
        x, y = int(nose[1]), int(nose[2])
        if x < 15 or y < 15 or x > w - 15 or y > h - 15:
            return None, None
            
        sample = img[y-15:y+15, x-15:x+15]
        avg_color_bgr = np.mean(sample, axis=(0, 1))
        avg_color_rgb = avg_color_bgr[::-1]
        
        # Relative ROI bounds [x1, y1, x2, y2]
        roi_bounds = [x-15, y-15, x+15, y+15]
        
        return avg_color_rgb, roi_bounds

    def map_to_palette(self, rgb):
        if rgb is None:
            return "Unknown"
            
        min_dist = float('inf')
        closest_tone = "Unknown"
        
        for tone, color in self.palette.items():
            dist = np.linalg.norm(np.array(rgb) - np.array(color))
            if dist < min_dist:
                min_dist = dist
                closest_tone = tone
                
        return closest_tone

    def get_color_recommendation(self, skin_tone):
        recommendations = {
            "Fair": ["Royal Blue", "Deep Red", "Emerald Green", "Pastels"],
            "Wheatish": ["Mustard Yellow", "Olive Green", "Warm Browns", "Teal"],
            "Dusky": ["White", "Gold", "Bright Orange", "Earthy Tones"],
            "Deep": ["Silver", "Cobalt Blue", "Pale Pink", "Wine Red"]
        }
        return recommendations.get(skin_tone, ["Neutral Colors"])
