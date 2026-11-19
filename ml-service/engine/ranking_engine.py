from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.preprocessing import OneHotEncoder


BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_PATH = BASE_DIR / "data" / "dataset_turismo_bogota_50k_rating.xlsx"
FEATURE_COLUMNS = [
    "plan_turistico_bogota",
    "tipo_viaje",
    "presupuesto_cop",
    "compania",
]
TARGET_COLUMN = "rating"
REQUIRED_COLUMNS = (*FEATURE_COLUMNS, TARGET_COLUMN)
COMPANION_CATEGORIES = ("solo", "pareja", "amigos", "familia")


def load_dataset(path: Path = DATASET_PATH) -> pd.DataFrame:
    if not path.is_file():
        raise FileNotFoundError(f"No se encontró el dataset de turismo: {path}")

    dataset = pd.read_excel(path, engine="openpyxl")
    missing_columns = set(REQUIRED_COLUMNS).difference(dataset.columns)
    if missing_columns:
        missing = ", ".join(sorted(missing_columns))
        raise ValueError(f"Al dataset le faltan columnas requeridas: {missing}")

    cleaned = dataset[list(REQUIRED_COLUMNS)].copy()
    for column in FEATURE_COLUMNS:
        cleaned[column] = cleaned[column].astype("string").str.strip().str.lower()
    cleaned[TARGET_COLUMN] = pd.to_numeric(cleaned[TARGET_COLUMN], errors="coerce")
    cleaned = cleaned.dropna(subset=[*FEATURE_COLUMNS, TARGET_COLUMN])

    if cleaned.empty:
        raise ValueError("El dataset no contiene registros válidos para entrenar.")

    return cleaned


def build_model() -> Pipeline:
    return make_pipeline(
        OneHotEncoder(handle_unknown="ignore"),
        RandomForestRegressor(
            n_estimators=100,
            min_samples_leaf=5,
            max_features=0.8,
            n_jobs=-1,
            random_state=42,
        ),
    )


class RecommendationEngine:
    def __init__(self, dataset: pd.DataFrame):
        self.dataset_rows = len(dataset)
        features = dataset[FEATURE_COLUMNS]
        ratings = dataset[TARGET_COLUMN]
        train_features, test_features, train_ratings, test_ratings = (
            train_test_split(
                features,
                ratings,
                test_size=0.2,
                random_state=42,
            )
        )

        validation_model = build_model()
        validation_model.fit(train_features, train_ratings)
        self.validation_mae = float(
            mean_absolute_error(
                test_ratings,
                validation_model.predict(test_features),
            )
        )

        self.model = build_model()
        self.model.fit(features, ratings)
        self.training_rows = len(features)
        self.plans = dataset.groupby("plan_turistico_bogota", as_index=False).agg(
            rating_average=(TARGET_COLUMN, "mean"),
            rating_samples=(TARGET_COLUMN, "size"),
            travel_types=(
                "tipo_viaje",
                lambda values: sorted(values.unique().tolist()),
            ),
        )
        self.travel_types = sorted(dataset["tipo_viaje"].unique().tolist())

    @classmethod
    def from_dataset(cls, path: Path = DATASET_PATH) -> "RecommendationEngine":
        return cls(load_dataset(path))

    def recommend(
        self,
        companion: str | None,
        budget_category: str,
        travel_types: list[str] | None = None,
        top_n: int = 3,
    ) -> list[dict[str, str | int | float]]:
        selected_types = sorted(set(travel_types or self.travel_types))
        if not selected_types:
            return []

        candidates = self.plans.assign(_join_key=1).merge(
            pd.DataFrame({"tipo_viaje": selected_types, "_join_key": 1}),
            on="_join_key",
        )
        candidates = candidates.drop(columns="_join_key")
        companion_scenarios = [companion] if companion else COMPANION_CATEGORIES
        candidates = candidates.assign(_join_key=1).merge(
            pd.DataFrame(
                {"compania": companion_scenarios, "_join_key": 1}
            ),
            on="_join_key",
        )
        candidates = candidates.drop(columns="_join_key")
        model_input = candidates[
            ["plan_turistico_bogota", "tipo_viaje"]
        ].copy()
        model_input["presupuesto_cop"] = budget_category
        model_input["compania"] = candidates["compania"]
        predictions = self.model.predict(model_input[FEATURE_COLUMNS])

        ranked = candidates.copy()
        ranked["predicted_rating"] = predictions
        ranked = (
            ranked.groupby(
                ["plan_turistico_bogota", "tipo_viaje"],
                as_index=False,
                sort=False,
            )
            .agg(
                predicted_rating=("predicted_rating", "mean"),
                rating_average=("rating_average", "first"),
                rating_samples=("rating_samples", "first"),
            )
            .sort_values(
                ["plan_turistico_bogota", "predicted_rating", "tipo_viaje"],
                ascending=[True, False, True],
            )
            .drop_duplicates("plan_turistico_bogota")
        )
        ranked = ranked.sort_values(
            ["predicted_rating", "rating_samples", "plan_turistico_bogota"],
            ascending=[False, False, True],
        ).head(top_n)

        return [
            {
                "plan_turistico_bogota": str(row.plan_turistico_bogota),
                "tipo_viaje": str(row.tipo_viaje),
                "predicted_rating": round(float(row.predicted_rating), 2),
                "rating_samples": int(row.rating_samples),
            }
            for row in ranked.itertuples(index=False)
        ]


engine = RecommendationEngine.from_dataset()


def recomendar(user: dict, top_n: int = 3) -> list[dict[str, str | int | float]]:
    return engine.recommend(
        companion=user["companions"],
        budget_category=user["presupuesto"],
        travel_types=user.get("tipo_viaje"),
        top_n=top_n,
    )
