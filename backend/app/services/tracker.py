"""Lightweight IoU-based tracker (ByteTrack-inspired).

Assigns temporary track IDs to detected faces so the recognition pipeline
doesn't re-process the same person every single frame.
"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class Track:
    track_id: int
    bbox: Tuple[int, int, int, int]  # x1, y1, x2, y2
    age: int = 0  # frames since last update
    student_id: Optional[int] = None
    processed: bool = False  # whether recognition has been run
    hits: int = 1


class SimpleTracker:
    """
    IoU-based multi-object tracker.
    - Match new detections to existing tracks via IoU.
    - Unmatched detections create new tracks.
    - Tracks that aren't updated for `max_age` frames are removed.
    """

    def __init__(self, max_age: int = 30, iou_threshold: float = 0.3):
        self.max_age = max_age
        self.iou_threshold = iou_threshold
        self.tracks: Dict[int, Track] = {}
        self._next_id = 1

    def update(self, detections: List[Tuple[int, int, int, int, float]]) -> List[Track]:
        """
        Update tracker with new detections.

        Args:
            detections: list of (x1, y1, x2, y2, conf)

        Returns:
            List of active Track objects.
        """
        if not detections:
            # Age all tracks
            to_remove = []
            for tid, track in self.tracks.items():
                track.age += 1
                if track.age > self.max_age:
                    to_remove.append(tid)
            for tid in to_remove:
                del self.tracks[tid]
            return list(self.tracks.values())

        det_bboxes = [d[:4] for d in detections]

        if not self.tracks:
            # First frame — create all tracks
            for bbox in det_bboxes:
                self.tracks[self._next_id] = Track(
                    track_id=self._next_id, bbox=bbox
                )
                self._next_id += 1
            return list(self.tracks.values())

        # Compute IoU matrix
        track_ids = list(self.tracks.keys())
        track_bboxes = [self.tracks[tid].bbox for tid in track_ids]
        iou_matrix = self._compute_iou_matrix(track_bboxes, det_bboxes)

        # Greedy matching
        matched_tracks = set()
        matched_dets = set()

        # Sort by IoU descending for greedy assignment
        n_tracks, n_dets = iou_matrix.shape
        flat_indices = np.argsort(-iou_matrix.ravel())

        for idx in flat_indices:
            t_idx = idx // n_dets
            d_idx = idx % n_dets

            if t_idx in matched_tracks or d_idx in matched_dets:
                continue

            if iou_matrix[t_idx, d_idx] < self.iou_threshold:
                break  # remaining IoUs are lower

            tid = track_ids[t_idx]
            self.tracks[tid].bbox = det_bboxes[d_idx]
            self.tracks[tid].age = 0
            self.tracks[tid].hits += 1
            matched_tracks.add(t_idx)
            matched_dets.add(d_idx)

        # Create new tracks for unmatched detections
        for d_idx in range(n_dets):
            if d_idx not in matched_dets:
                self.tracks[self._next_id] = Track(
                    track_id=self._next_id, bbox=det_bboxes[d_idx]
                )
                self._next_id += 1

        # Age unmatched tracks and remove old ones
        to_remove = []
        for t_idx, tid in enumerate(track_ids):
            if t_idx not in matched_tracks:
                self.tracks[tid].age += 1
                if self.tracks[tid].age > self.max_age:
                    to_remove.append(tid)
        for tid in to_remove:
            del self.tracks[tid]

        return list(self.tracks.values())

    def reset(self):
        """Clear all tracks."""
        self.tracks.clear()
        self._next_id = 1

    @staticmethod
    def _compute_iou_matrix(
        boxes_a: List[Tuple[int, int, int, int]],
        boxes_b: List[Tuple[int, int, int, int]],
    ) -> np.ndarray:
        """Compute pairwise IoU between two lists of bounding boxes."""
        a = np.array(boxes_a, dtype=np.float32)
        b = np.array(boxes_b, dtype=np.float32)

        n, m = len(a), len(b)
        iou = np.zeros((n, m), dtype=np.float32)

        for i in range(n):
            for j in range(m):
                x1 = max(a[i][0], b[j][0])
                y1 = max(a[i][1], b[j][1])
                x2 = min(a[i][2], b[j][2])
                y2 = min(a[i][3], b[j][3])

                inter = max(0, x2 - x1) * max(0, y2 - y1)
                area_a = (a[i][2] - a[i][0]) * (a[i][3] - a[i][1])
                area_b = (b[j][2] - b[j][0]) * (b[j][3] - b[j][1])
                union = area_a + area_b - inter

                iou[i, j] = inter / union if union > 0 else 0

        return iou
