"""Face embedding extraction and matching using InsightFace (ArcFace)."""

import cv2
import numpy as np
from typing import Optional, Tuple


class FaceRecognizer:
    """Extract 512-d ArcFace embeddings and match against a database of known faces."""

    def __init__(self):
        self._app = None
        self._load_model()

    def _load_model(self):
        """Load the InsightFace analysis app."""
        try:
            import insightface
            from insightface.app import FaceAnalysis
            self._app = FaceAnalysis(
                name="buffalo_l",
                providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
            )
            self._app.prepare(ctx_id=0, det_size=(640, 640))
            print("✅ InsightFace ArcFace model loaded")
        except Exception as e:
            print(f"⚠️  InsightFace not available ({e}), face recognition disabled")
            self._app = None

    def extract_embedding(self, face_img: np.ndarray) -> Optional[np.ndarray]:
        """
        Extract a 512-d embedding from a face image (BGR).
        The image can be a full frame or a cropped face — InsightFace
        runs its own detection internally.

        Returns:
            np.ndarray of shape (512,) or None if no face found.
        """
        if self._app is None:
            return None

        faces = self._app.get(face_img)
        if not faces:
            return None

        # Take the largest / most confident face
        face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        emb = face.normed_embedding  # already L2-normalised
        return emb.astype(np.float32)

    def extract_embedding_from_crop(self, face_crop: np.ndarray) -> Optional[np.ndarray]:
        """
        Given a tightly-cropped face, pad it a bit and extract embedding.
        """
        if self._app is None:
            return None

        h, w = face_crop.shape[:2]
        # Pad to give InsightFace room for landmark detection
        pad = int(max(h, w) * 0.3)
        padded = cv2.copyMakeBorder(
            face_crop, pad, pad, pad, pad,
            cv2.BORDER_CONSTANT, value=(0, 0, 0)
        )
        return self.extract_embedding(padded)

    @staticmethod
    def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
        """Compute cosine similarity between two normalised vectors."""
        return float(np.dot(a, b))

    def match(
        self,
        query_embedding: np.ndarray,
        db_embeddings: list[Tuple[int, np.ndarray]],
        threshold: float = 0.45,
    ) -> Optional[Tuple[int, float]]:
        """
        Match a query embedding against a list of (student_id, embedding) pairs.

        Returns:
            (student_id, similarity_score) of the best match above threshold,
            or None if no match.
        """
        best_id = None
        best_score = -1.0

        for student_id, db_emb in db_embeddings:
            score = self.cosine_similarity(query_embedding, db_emb)
            if score > best_score:
                best_score = score
                best_id = student_id

        if best_score >= threshold and best_id is not None:
            return (best_id, best_score)
        return None


# Singleton
face_recognizer = FaceRecognizer()
