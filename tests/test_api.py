import unittest
from fastapi.testclient import TestClient
from backend.main import app

class TestChronicleAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_endpoint(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")

    def test_telemetry_endpoint(self):
        response = self.client.get("/api/v1/telemetry")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_processed", data)
        self.assertIn("quarantined_count", data)
        self.assertIn("cloud_tokens_saved_pct", data)
        self.assertIn("avg_s1_latency_ms", data)

    def test_vault_list_endpoint(self):
        response = self.client.get("/api/v1/vault/items")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("count", data)
        self.assertIn("items", data)

    def test_quarantine_list_endpoint(self):
        response = self.client.get("/api/v1/vault/quarantine")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("quarantined_count", data)

if __name__ == "__main__":
    unittest.main()
