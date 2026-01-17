import cv2
import mediapipe as mp
import numpy as np

class PoseDetector:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(static_image_mode=False, min_detection_confidence=0.5, min_tracking_confidence=0.5)
        self.mp_draw = mp.solutions.drawing_utils

    def find_pose(self, img, draw=True):
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        self.results = self.pose.process(img_rgb)
        if self.results.pose_landmarks:
            if draw:
                self.mp_draw.draw_landmarks(img, self.results.pose_landmarks, self.mp_pose.POSE_CONNECTIONS)
        return img

    def get_position(self, img):
        lm_list = []
        if self.results.pose_landmarks:
            for id, lm in enumerate(self.results.pose_landmarks.landmark):
                h, w, c = img.shape
                cx, cy = int(lm.x * w), int(lm.y * h)
                lm_list.append([id, cx, cy, lm.z])
        return lm_list

    def calculate_metrics(self, lm_list):
        if not lm_list:
            return None
        
        # Simple body structure logic
        # Shoulder-to-Waist ratio
        left_shoulder = lm_list[11]
        right_shoulder = lm_list[12]
        left_hip = lm_list[23]
        right_hip = lm_list[24]
        
        shoulder_width = np.sqrt((left_shoulder[1] - right_shoulder[1])**2 + (left_shoulder[2] - right_shoulder[2])**2)
        waist_width = np.sqrt((left_hip[1] - right_hip[1])**2 + (left_hip[2] - right_hip[2])**2)
        
        ratio = shoulder_width / waist_width if waist_width > 0 else 0
        
        body_type = "Mesomorph"
        if ratio > 1.4:
            body_type = "Ectomorph"
        elif ratio < 1.1:
            body_type = "Endomorph"
            
        return {
            "shoulder_width": round(shoulder_width, 2),
            "waist_width": round(waist_width, 2),
            "ratio": round(ratio, 2),
            "body_type": body_type
        }

if __name__ == "__main__":
    detector = PoseDetector()
    cap = cv2.VideoCapture(0)
    while True:
        success, img = cap.read()
        if not success:
            break
        img = detector.find_pose(img)
        lms = detector.get_position(img)
        metrics = detector.calculate_metrics(lms)
        if metrics:
            print(metrics)
        cv2.imshow("Image", img)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
