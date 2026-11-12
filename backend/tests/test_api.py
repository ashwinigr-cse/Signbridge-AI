"""API Endpoint Integration Tests"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health_check_endpoint():
    """Verify health check returns status healthy."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "app" in data
    assert "version" in data


def test_dataset_summary_endpoint():
    """Verify dataset summary returns proper fields."""
    response = client.get("/api/dataset/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_samples" in data
    assert "total_classes" in data
    assert "class_distribution" in data
    assert "supported_vocabulary" in data


def test_sentence_action_endpoint():
    """Verify sentence action operations."""
    # Clear
    client.post("/api/sentence/action", json={"action": "clear"})

    # Add words
    res1 = client.post("/api/sentence/action", json={"action": "add", "word": "Namaste"})
    assert res1.status_code == 200
    assert "Namaste" in res1.json()["sentence"]

    res2 = client.post("/api/sentence/action", json={"action": "add", "word": "Friend"})
    assert res2.status_code == 200
    assert res2.json()["sentence"] == "Namaste Friend."


def test_settings_get_and_post():
    """Verify settings read and write."""
    res_get = client.get("/api/settings")
    assert res_get.status_code == 200
    curr_settings = res_get.json()

    curr_settings["confidence_threshold"] = 0.85
    res_post = client.post("/api/settings", json=curr_settings)
    assert res_post.status_code == 200
    assert res_post.json()["confidence_threshold"] == 0.85
