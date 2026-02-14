"""YOLOv8-based face detection service."""

import cv2
import numpy as np
from typing import List, Tuple


class FaceDetector:
    """Detect faces in frames using YOLOv8-face, MediaPipe, or OpenCV fallback."""

    def __init__(self):
        self._model = None
        self._use_mediapipe = False
        self._mp_detector = None
        self._use_opencv_cascade = False
        self._cascade = None
        self._load_model()

    def _load_model(self):
        """Try loading YOLOv8-face; fall back to MediaPipe/OpenCV if unavailable."""
        try:
            from ultralytics import YOLO
            import os
            model_path = os.path.join(os.path.dirname(__file__), "..", "..", "models", "yolov8n-face.pt")
            if os.path.exists(model_path):
                self._model = YOLO(model_path)
                print("✅ Loaded YOLOv8-face model from disk")
            else:
                self._model = YOLO("yolov8n.pt")
                print("⚠️  YOLOv8-face not found, using standard YOLOv8n + face fallback")
                self._use_mediapipe = True
                self._init_face_fallback()
        except Exception as e:
            print(f"⚠️  YOLO unavailable ({e}), falling back to face detection fallback")
            self._use_mediapipe = True
            self._init_face_fallback()

    def _init_face_fallback(self):
        """Initialize face detection fallback: try MediaPipe legacy, then OpenCV Haar cascade."""
        # Try MediaPipe legacy solutions API
        try:
            import mediapipe as mp
            self._mp_detector = mp.solutions.face_detection.FaceDetection(
                model_selection=1, min_detection_confidence=0.5
            )
            print("✅ MediaPipe face detector initialized (legacy API)")
            return
        except (ImportError, AttributeError):
            pass

        # Try MediaPipe Tasks API (newer versions)
        try:
            import mediapipe as mp
            from mediapipe.tasks import python as mp_python
            from mediapipe.tasks.python import vision

            # Use the bundled model
            import os
            model_path = os.path.join(os.path.dirname(__file__), "..", "..", "models", "blaze_face_short_range.tflite")

            if os.path.exists(model_path):
                base_options = mp_python.BaseOptions(model_asset_path=model_path)
                options = vision.FaceDetectorOptions(
                    base_options=base_options,
                    min_detection_confidence=0.5,
                )
                self._mp_detector = vision.FaceDetector.create_from_options(options)
                self._use_mediapipe = True  # But we'll use the Tasks API path
                print("✅ MediaPipe face detector initialized (Tasks API)")
                return
        except (ImportError, AttributeError, Exception) as e:
            print(f"⚠️  MediaPipe Tasks API failed ({e})")

        # Final fallback: OpenCV Haar Cascade (always available with opencv)
        try:
            cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            self._cascade = cv2.CascadeClassifier(cascade_path)
            if not self._cascade.empty():
                self._use_opencv_cascade = True
                self._mp_detector = None  # Mark mediapipe as unavailable
                print("✅ OpenCV Haar Cascade face detector initialized (fallback)")
                return
        except Exception as e:
            print(f"⚠️  OpenCV cascade failed ({e})")

        print("❌ No face detection method available!")
        self._mp_detector = None

    def detect(self, frame: np.ndarray) -> List[Tuple[int, int, int, int, float]]:
        """
        Detect faces in a BGR frame.

        Returns:
            List of (x1, y1, x2, y2, confidence) tuples.
        """
        h, w = frame.shape[:2]

        if self._model and not self._use_mediapipe:
            return self._detect_yolo_face(frame)
        elif self._use_opencv_cascade and self._cascade is not None:
            return self._detect_opencv(frame, h, w)
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
        """Detect faces using MediaPipe (legacy solutions API)."""
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

    def _detect_opencv(self, frame: np.ndarray, h: int, w: int) -> List[Tuple[int, int, int, int, float]]:
        """Detect faces using OpenCV Haar Cascade (always available)."""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self._cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
        )
        boxes = []
        for (x, y, fw, fh) in faces:
            boxes.append((x, y, x + fw, y + fh, 0.9))  # Haar doesn't give confidence, use 0.9
        return boxes


# Singleton
face_detector = FaceDetector()
