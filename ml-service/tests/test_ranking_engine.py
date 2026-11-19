import unittest

from engine.ranking_engine import engine


class RecommendationEngineTests(unittest.TestCase):
    def test_recommendations_use_selected_travel_types(self):
        recommendations = engine.recommend(
            companion="pareja",
            budget_category="medio",
            travel_types=["naturaleza"],
            top_n=5,
        )

        self.assertEqual(len(recommendations), 5)
        self.assertTrue(
            all(item["tipo_viaje"] == "naturaleza" for item in recommendations)
        )
        self.assertEqual(
            len({item["plan_turistico_bogota"] for item in recommendations}),
            len(recommendations),
        )

    def test_multiple_selected_types_return_unique_plans(self):
        recommendations = engine.recommend(
            companion="familia",
            budget_category="economico",
            travel_types=["cultural", "gastronomia"],
            top_n=10,
        )

        plan_names = [item["plan_turistico_bogota"] for item in recommendations]
        self.assertEqual(len(plan_names), len(set(plan_names)))
        self.assertTrue(
            all(
                item["tipo_viaje"] in {"cultural", "gastronomia"}
                for item in recommendations
            )
        )


if __name__ == "__main__":
    unittest.main()
