import csv
import os
import random
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

try:
    import joblib  # type: ignore
except Exception as e:  # pragma: no cover
    joblib = None  # type: ignore
    _joblib_import_error = e  # type: ignore


class ModelNotReadyError(RuntimeError):
    pass


DEMO_CLASS_NAMES: List[str] = ["جوع", "عطش", "حمام", "دواء"]


def _repo_root() -> str:
    # backend/ml/eeg_rf_4word_demo.py -> backend -> repo root
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def _rf_demo_dir() -> str:
    return os.path.join(
        _repo_root(),
        "LiveDataModels",
        "RF 4-word sub-dependent on 15 sub(acc88_)",
    )


def _artifact_paths(subject: str = "aya") -> Dict[str, str]:
    base = _rf_demo_dir()
    models_dir = os.path.join(base, "models")
    split_dir = os.path.join(base, "RF_4Words_88acc_Split_Data")
    # Dataset files are capitalized (e.g., Aya_Test_30.csv)
    subject_title = subject[:1].upper() + subject[1:] if subject else "Aya"
    return {
        "rf_model": os.path.join(models_dir, f"RF_Model_{subject}.pkl"),
        "rf_scaler": os.path.join(models_dir, f"RF_Scaler_{subject}.pkl"),
        "rf_riemann": os.path.join(models_dir, f"RF_Riemann_{subject}.pkl"),
        "demo_csv": os.path.join(split_dir, f"{subject_title}_Test_30.csv"),
    }


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


def _load_csv_feature_rows(csv_path: str) -> Tuple[List[str], List[np.ndarray]]:
    if not os.path.exists(csv_path):
        raise ModelNotReadyError(f"Demo CSV not found: {csv_path}")

    with open(csv_path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise ModelNotReadyError(f"Demo CSV has no header: {csv_path}")

        feat_cols = [c for c in reader.fieldnames if c.startswith("feat_")]
        if not feat_cols:
            raise ModelNotReadyError(f"Demo CSV missing feat_* columns: {csv_path}")
        # Ensure stable order feat_0..feat_N
        feat_cols.sort(key=lambda x: int(x.split("_")[1]))

        rows: List[np.ndarray] = []
        for row in reader:
            try:
                x = np.asarray([float(row[c]) for c in feat_cols], dtype=np.float32)
            except Exception as e:
                raise ModelNotReadyError(f"Failed parsing demo CSV row: {e}") from e
            rows.append(x)

    if not rows:
        raise ModelNotReadyError(f"Demo CSV has no data rows: {csv_path}")
    return feat_cols, rows


@lru_cache(maxsize=1)
def load_demo_bundle(subject: str = "aya") -> Dict[str, Any]:
    if joblib is None:  # pragma: no cover
        raise ModelNotReadyError(f"joblib import failed: {_joblib_import_error}")

    paths = _artifact_paths(subject=subject)
    model_path = paths["rf_model"]
    if not os.path.exists(model_path):
        raise ModelNotReadyError(f"RF model artifact not found: {model_path}")

    def _safe_joblib_load(path: str) -> Any:
        try:
            return joblib.load(path)
        except ModuleNotFoundError:
            # Some artifacts (e.g., pyriemann TangentSpace) require optional deps.
            # For demo, we can proceed without them if the model doesn't need it.
            return None

    model = _safe_joblib_load(model_path)
    if model is None:
        raise ModelNotReadyError(f"Failed to load RF model artifact: {model_path}")

    scaler = _safe_joblib_load(paths["rf_scaler"]) if os.path.exists(paths["rf_scaler"]) else None
    riemann = _safe_joblib_load(paths["rf_riemann"]) if os.path.exists(paths["rf_riemann"]) else None

    feat_cols, demo_rows = _load_csv_feature_rows(paths["demo_csv"])

    return {
        "subject": subject,
        "paths": paths,
        "model": model,
        "scaler": scaler,
        "riemann": riemann,
        "demo_feat_cols": feat_cols,
        "demo_rows": demo_rows,
        "class_names": list(DEMO_CLASS_NAMES),
    }


def _maybe_transform(X: np.ndarray, model: Any = None, scaler: Any = None, riemann: Any = None) -> np.ndarray:
    out = X
    # Some saved artifacts store preprocessing pieces; apply if available.
    if riemann is not None and hasattr(riemann, "transform"):
        out = riemann.transform(out)
    if scaler is not None and hasattr(scaler, "transform"):
        # Only apply if feature dimensionality matches what scaler was trained on.
        scaler_n = getattr(scaler, "n_features_in_", None)
        if scaler_n is None or int(scaler_n) == int(out.shape[1]):
            out = scaler.transform(out)
    return out


def predict_live_demo(subject: str = "aya", seed: Optional[int] = None) -> Prediction:
    """
    Demo-only inference: samples a row from Best_Test_Data_{subject}.csv and runs the
    subject-dependent RF model from LiveDataModels.
    """
    bundle = load_demo_bundle(subject=subject)
    model = bundle["model"]
    scaler = bundle["scaler"]
    riemann = bundle["riemann"]
    class_names: List[str] = bundle["class_names"]
    rows: List[np.ndarray] = bundle["demo_rows"]

    rng = random.Random(seed) if seed is not None else random
    x = rows[rng.randrange(0, len(rows))]
    X = x.reshape(1, -1)
    X2 = _maybe_transform(X, model=model, scaler=scaler, riemann=riemann)

    if not hasattr(model, "predict_proba"):
        raise ModelNotReadyError("Loaded RF model does not support predict_proba.")

    probs = np.asarray(model.predict_proba(X2)[0], dtype=np.float64)
    if probs.ndim != 1:
        raise RuntimeError("Unexpected probability output shape")

    pred_id = int(np.argmax(probs))
    conf = float(probs[pred_id])
    pred_word = class_names[pred_id] if pred_id < len(class_names) else str(pred_id)

    return Prediction(
        predicted_id=pred_id,
        predicted_word_ar=pred_word,
        confidence=conf,
        probabilities=[float(p) for p in probs.tolist()],
        class_names=class_names if class_names else [str(i) for i in range(len(probs))],
    )

