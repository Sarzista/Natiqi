"""
Generate a placeholder model artifact at Saved_Model/natiqi_5word_svm_pipeline.pkl.

This is ONLY to make the app runnable end-to-end while you re-export the real model
from the training notebook. Replace the generated .pkl with the real one as soon as
you have it.
"""

import os

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import LinearSVC


def main() -> None:
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    saved_dir = os.path.join(repo_root, "Saved_Model")
    os.makedirs(saved_dir, exist_ok=True)

    model_path = os.path.join(saved_dir, "natiqi_5word_svm_pipeline.pkl")

    # Create a pipeline with the same shape expectations (154 features).
    # Fit on tiny synthetic data so predict_proba works.
    rng = np.random.default_rng(42)
    X = rng.normal(size=(200, 154)).astype(np.float32)
    y = rng.integers(low=0, high=5, size=(200,), dtype=np.int64)

    final_model = Pipeline(
        [
            ("scaler", StandardScaler()),
            ("clf", CalibratedClassifierCV(LinearSVC(C=1.0, class_weight="balanced"), method="sigmoid", cv=3)),
        ]
    )
    final_model.fit(X, y)

    joblib.dump(final_model, model_path)
    # Avoid Unicode issues on some Windows consoles
    print(f"Wrote placeholder model to: {model_path}")


if __name__ == "__main__":
    main()

