"""YOLOv8-based face detection service."""

import cv2
import numpy as np
from typing import List, Tuple


class FaceDetector:
    """Detect faces in frames using YOLOv8-face or MediaPipe fallback."""

    def __init__(self):
        self._model = None
        self._use_mediapipe = False
        self._mp_detector = None
        self._load_model()

    def _load_model(self):
        """Try loading YOLOv8-face; fall back to MediaPipe if unavailable."""
        try:
            from ultralytics import YOLO
            # Try YOLOv8-face (community model) — if not present use standard yolov8n
            import os
            model_path = os.path.join(os.path.dirname(__file__), "..", "..", "models", "yolov8n-face.pt")
            if os.path.exists(model_path):
                self._model = YOLO(model_path)
                print("✅ Loaded YOLOv8-face model from disk")
            else:
                # Use standard YOLOv8n — it detects persons, we'll crop upper body
                self._model = YOLO("yolov8n.pt")
                print("⚠️  YOLOv8-face not found, using standard YOLOv8n + MediaPipe face mesh")
                self._use_mediapipe = True
                self._init_mediapipe()
        except Exception as e:
            print(f"⚠️  YOLO unavailable ({e}), falling back to MediaPipe only")
            self._use_mediapipe = True
            self._init_mediapipe()

    def _init_mediapipe(self):
        """Initialize MediaPipe face detection as fallback."""
        try:
            import mediapipe as mp
            self._mp_detector = mp.solutions.face_detection.FaceDetection(
                model_selection=1, min_detection_confidence=0.5
            )
            print("✅ MediaPipe face detector initialized")
        except ImportError:
            print("❌ Neither YOLO nor MediaPipe available!")
            self._mp_detector = None

    def detect(self, frame: np.ndarray) -> List[Tuple[int, int, int, int, float]]:
        """
        Detect faces in a BGR frame.

        Returns:
            List of (x1, y1, x2, y2, confidence) tuples.
        """
        h, w = frame.shape[:2]

        if self._model and not self._use_mediapipe:
            # Pure YOLOv8-face
            return self._detect_yolo_face(frame)
        elif self._mp_detector:
            return self._detect_mediapipe(frame, h, w)
        else:
            return []

    def _detect_yolo_face(self, frame: np.ndarray) -> List[Tuple[int, int, int, int, float]]:
        """Detect using YOLOv8-face model (all classes are faces)."""
        results = self._model(frame, verbose=False, conf=0.4)
        boxes = []
        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                conf = float(box.conf[0])
                boxes.append((x1, y1, x2, y2, conf))
        return boxes

    def _detect_mediapipe(self, frame: np.ndarray, h: int, w: int) -> List[Tuple[int, int, int, int, float]]:
        """Detect faces using MediaPipe."""
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self._mp_detector.process(rgb)
        boxes = []
        if results.detections:
            for det in results.detections:
                bbox = det.location_data.relative_bounding_box
                x1 = max(0, int(bbox.xmin * w))
                y1 = max(0, int(bbox.ymin * h))
                x2 = min(w, int((bbox.xmin + bbox.width) * w))
                y2 = min(h, int((bbox.ymin + bbox.height) * h))
                conf = float(det.score[0])
                boxes.append((x1, y1, x2, y2, conf))
        return boxes


# Singleton
face_detector = FaceDetector()
