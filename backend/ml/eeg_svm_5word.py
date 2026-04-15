import json
import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np

try:
    # Prefer standalone joblib (ships with scikit-learn, too)
    import joblib  # type: ignore
except Exception as e:  # pragma: no cover
    joblib = None  # type: ignore
    _joblib_import_error = e  # type: ignore

from scipy.signal import welch
from scipy.stats import kurtosis, skew


DEFAULT_FS = 128
DEFAULT_CHANNELS = [
    "AF3",
    "F7",
    "F3",
    "FC5",
    "T7",
    "P7",
    "O1",
    "O2",
    "P8",
    "T8",
    "FC6",
    "F4",
    "F8",
    "AF4",
]


class ModelNotReadyError(RuntimeError):
    pass


def _repo_root() -> str:
    # backend/ml/eeg_svm_5word.py -> backend -> repo root
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def _saved_model_dir() -> str:
    return os.path.join(_repo_root(), "Saved_Model")


def _bandpower(x: np.ndarray, fs: int, fmin: float, fmax: float) -> float:
    f, p = welch(x, fs=fs, nperseg=min(256, len(x)))
    m = (f >= fmin) & (f < fmax)
    if not np.any(m):
        return 0.0
    # np.trapz was removed in newer NumPy; use trapezoid for compatibility.
    return float(np.trapezoid(p[m], f[m]))


def _hjorth_params(x: np.ndarray) -> Tuple[float, float, float]:
    dx = np.diff(x)
    ddx = np.diff(dx)
    var0 = float(np.var(x))
    var1 = float(np.var(dx)) if len(dx) > 0 else 0.0
    var2 = float(np.var(ddx)) if len(ddx) > 0 else 0.0

    activity = var0
    mobility = float(np.sqrt(var1 / (var0 + 1e-12)))
    complexity = float(np.sqrt(var2 / (var1 + 1e-12)) / (mobility + 1e-12))
    return activity, mobility, complexity


def features_for_window(win_14xL: np.ndarray, fs: int = DEFAULT_FS) -> np.ndarray:
    """
    Match the training notebook feature order:
      for each channel:
        bandpower in 4 bands (1-4,4-8,8-13,13-30)
        hjorth (activity, mobility, complexity)
        stats (mean, std, skew, kurtosis)
    Total: 14 * (4 + 3 + 4) = 154
    """
    if win_14xL.ndim != 2:
        raise ValueError("window must be 2D (14, L)")
    if win_14xL.shape[0] != 14:
        raise ValueError("window first dimension must be 14 channels")

    bands = [(1, 4), (4, 8), (8, 13), (13, 30)]
    feats: List[float] = []
    for ch in range(win_14xL.shape[0]):
        x = np.asarray(win_14xL[ch], dtype=np.float64)

        for lo, hi in bands:
            feats.append(_bandpower(x, fs, lo, hi))

        a, m, c = _hjorth_params(x)
        feats.extend([a, m, c])

        feats.extend(
            [
                float(np.mean(x)),
                float(np.std(x)),
                float(skew(x)),
                float(kurtosis(x)),
            ]
        )

    return np.asarray(feats, dtype=np.float32)


@dataclass(frozen=True)
class Prediction:
    predicted_id: int
    predicted_word_ar: str
    confidence: float
    probabilities: List[float]
    class_names: List[str]

    def to_json(self) -> Dict[str, Any]:
        return {
            "predicted_id": self.predicted_id,
            "predicted_word_ar": self.predicted_word_ar,
            "confidence": self.confidence,
            "probs": self.probabilities,
            "class_names": self.class_names,
        }


def _read_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def load_model_bundle() -> Dict[str, Any]:
    saved_dir = _saved_model_dir()
    pkl_path = os.path.join(saved_dir, "natiqi_5word_svm_pipeline.pkl")
    config_path = os.path.join(saved_dir, "config.json")
    label_path = os.path.join(saved_dir, "label_mapping.json")

    if not os.path.exists(pkl_path):
        raise ModelNotReadyError(
            "Model file not found. Expected Saved_Model/natiqi_5word_svm_pipeline.pkl. "
            "Export it from the notebook using joblib.dump(final_model, model_path)."
        )
    if joblib is None:  # pragma: no cover
        raise ModelNotReadyError(f"joblib import failed: {_joblib_import_error}")

    model = joblib.load(pkl_path)
    config = _read_json(config_path) if os.path.exists(config_path) else {}
    label_mapping = _read_json(label_path) if os.path.exists(label_path) else {}

    # Derive class names in stable order (0..n-1) if mapping exists
    class_names: List[str] = []
    if label_mapping:
        for i in range(len(label_mapping)):
            class_names.append(str(label_mapping.get(str(i), str(i))))
    elif isinstance(config.get("class_names"), list):
        class_names = [str(x) for x in config["class_names"]]

    return {
        "model": model,
        "config": config,
        "label_mapping": label_mapping,
        "class_names": class_names,
    }


def predict_window(window_14x128: np.ndarray, fs: int = DEFAULT_FS) -> Prediction:
    window = np.asarray(window_14x128, dtype=np.float32)
    if window.shape != (14, 128):
        raise ValueError("window must have shape (14, 128)")

    bundle = load_model_bundle()
    model = bundle["model"]
    class_names: List[str] = bundle.get("class_names") or []

    feats = features_for_window(window, fs=fs)  # (154,)
    X = feats.reshape(1, -1)

    if not hasattr(model, "predict_proba"):
        raise ModelNotReadyError("Loaded model does not support predict_proba.")

    probs = np.asarray(model.predict_proba(X)[0], dtype=np.float64)
    if probs.ndim != 1:
        raise RuntimeError("Unexpected probability output shape")

    pred_id = int(np.argmax(probs))
    conf = float(probs[pred_id])
    pred_word = class_names[pred_id] if pred_id < len(class_names) else str(pred_id)

    return Prediction(
        predicted_id=pred_id,
        predicted_word_ar=pred_word,
        confidence=conf,
        probabilities=[float(x) for x in probs.tolist()],
        class_names=class_names if class_names else [str(i) for i in range(len(probs))],
    )

