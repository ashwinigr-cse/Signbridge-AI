"""Indian Sign Language (ISL) Baseline Seed Generator

Synthesizes biomechanically accurate 21-joint skeletal landmarks for core ISL signs
with realistic natural joint articulation variations to bootstrap initial training.
"""

import numpy as np
from typing import List, Dict, Any


def _create_hand_skeleton(
    thumb_curl: float = 0.0,
    index_curl: float = 0.0,
    middle_curl: float = 0.0,
    ring_curl: float = 0.0,
    pinky_curl: float = 0.0,
    thumb_spread: float = 0.2,
    finger_spread: float = 0.1,
    tilt_x: float = 0.0,
    tilt_y: float = 0.0,
    noise_level: float = 0.015
) -> List[Dict[str, float]]:
    """
    Constructs a 21-point hand skeleton with controllable finger curls (0.0=fully extended, 1.0=fully curled fist).
    Returns list of 21 landmark dicts with x, y, z.
    """
    # 0: Wrist
    wrist = np.array([0.5, 0.8, 0.0], dtype=np.float32)

    # Base MCP (Metacarpophalangeal) joints
    # 1: Thumb CMC, 2: Thumb MCP, 3: Thumb IP, 4: Thumb Tip
    # 5: Index MCP, 6: Index PIP, 7: Index DIP, 8: Index Tip
    # 9: Middle MCP, 10: Middle PIP, 11: Middle DIP, 12: Middle Tip
    # 13: Ring MCP, 14: Ring PIP, 15: Ring DIP, 16: Ring Tip
    # 17: Pinky MCP, 18: Pinky PIP, 19: Pinky DIP, 20: Pinky Tip

    points = [wrist]

    # Thumb chain
    t_cmc = wrist + np.array([-0.06 - thumb_spread * 0.1, -0.06, 0.01])
    t_mcp = t_cmc + np.array([-0.05 - thumb_spread * 0.1, -0.07, 0.02 * (1 - thumb_curl)])
    t_ip = t_mcp + np.array([-0.04 * (1 - thumb_curl), -0.06 * (1 - thumb_curl), 0.04 * thumb_curl])
    t_tip = t_ip + np.array([-0.03 * (1 - thumb_curl), -0.05 * (1 - thumb_curl), 0.05 * thumb_curl])
    points.extend([t_cmc, t_mcp, t_ip, t_tip])

    # 4 Fingers definitions: (MCP pos relative to wrist, curl factor, spread angle)
    fingers_params = [
        (index_curl, -0.06 - finger_spread * 0.08, 0.08),   # Index
        (middle_curl, -0.01, 0.09),                        # Middle
        (ring_curl, 0.04 + finger_spread * 0.05, 0.085),    # Ring
        (pinky_curl, 0.08 + finger_spread * 0.12, 0.07)     # Pinky
    ]

    for curl, x_off, length in fingers_params:
        mcp = wrist + np.array([x_off, -0.18, 0.0])
        # When curl=0: extends upward (-Y)
        # When curl=1: curls back downward and inward (+Z, +Y)
        ext_y = -length * (1.0 - 0.7 * curl)
        curl_z = length * 0.8 * curl

        pip = mcp + np.array([0.0, ext_y * 0.4, curl_z * 0.4])
        dip = pip + np.array([0.0, ext_y * 0.35, curl_z * 0.4])
        tip = dip + np.array([0.0, ext_y * 0.25, curl_z * 0.2])
        points.extend([mcp, pip, dip, tip])

    # Apply tilts and noise
    result = []
    for pt in points:
        noise = np.random.normal(0, noise_level, 3) if noise_level > 0 else np.zeros(3)
        adjusted = pt + noise + np.array([tilt_x, tilt_y, 0.0])
        result.append({
            "x": float(np.clip(adjusted[0], 0.05, 0.95)),
            "y": float(np.clip(adjusted[1], 0.05, 0.95)),
            "z": float(adjusted[2])
        })

    return result


def generate_isl_seed_samples(samples_per_gesture: int = 15) -> List[Dict[str, Any]]:
    """Generates labeled gesture samples covering primary Indian Sign Language symbols."""
    gesture_definitions = {
        "Namaste": {
            # Both hands joined / Flat vertical open hand near center
            "thumb_curl": 0.1, "index_curl": 0.0, "middle_curl": 0.0, "ring_curl": 0.0, "pinky_curl": 0.0,
            "thumb_spread": 0.05, "finger_spread": 0.0
        },
        "Hello": {
            # Open palm facing forward, fingers upright and slightly spread
            "thumb_curl": 0.0, "index_curl": 0.0, "middle_curl": 0.0, "ring_curl": 0.0, "pinky_curl": 0.0,
            "thumb_spread": 0.5, "finger_spread": 0.3
        },
        "Thank You": {
            # Hand flat, moving from chin forward, fingers flat together
            "thumb_curl": 0.2, "index_curl": 0.0, "middle_curl": 0.0, "ring_curl": 0.0, "pinky_curl": 0.0,
            "thumb_spread": 0.1, "finger_spread": 0.05
        },
        "Yes": {
            # Fist nod (S handshape), all fingers curled tight into fist
            "thumb_curl": 0.9, "index_curl": 1.0, "middle_curl": 1.0, "ring_curl": 1.0, "pinky_curl": 1.0,
            "thumb_spread": 0.0, "finger_spread": 0.0
        },
        "No": {
            # Index and Middle extend and tap Thumb (Pinch / N-handshape)
            "thumb_curl": 0.6, "index_curl": 0.6, "middle_curl": 0.6, "ring_curl": 1.0, "pinky_curl": 1.0,
            "thumb_spread": 0.2, "finger_spread": 0.0
        },
        "Help": {
            # Open flat palm supporting a thumbs-up handshape
            "thumb_curl": 0.0, "index_curl": 0.95, "middle_curl": 0.95, "ring_curl": 0.95, "pinky_curl": 0.95,
            "thumb_spread": 0.8, "finger_spread": 0.0
        },
        "Please": {
            # Open palm touching chest in subtle circular motion
            "thumb_curl": 0.1, "index_curl": 0.0, "middle_curl": 0.0, "ring_curl": 0.0, "pinky_curl": 0.0,
            "thumb_spread": 0.2, "finger_spread": 0.08
        },
        "Water": {
            # W-handshape: Index, Middle, Ring extended upright; Thumb holds down Pinky
            "thumb_curl": 0.8, "index_curl": 0.0, "middle_curl": 0.0, "ring_curl": 0.0, "pinky_curl": 0.9,
            "thumb_spread": 0.3, "finger_spread": 0.2
        },
        "Food": {
            # Fingertips clustered together towards mouth (O / Flower handshape)
            "thumb_curl": 0.5, "index_curl": 0.7, "middle_curl": 0.7, "ring_curl": 0.7, "pinky_curl": 0.7,
            "thumb_spread": 0.2, "finger_spread": 0.0
        },
        "Good": {
            # Classic Thumbs Up: Thumb straight up, all 4 fingers fully curled
            "thumb_curl": 0.0, "index_curl": 1.0, "middle_curl": 1.0, "ring_curl": 1.0, "pinky_curl": 1.0,
            "thumb_spread": 0.9, "finger_spread": 0.0
        },
        "Bad": {
            # Thumbs Down: Fist rotated with thumb pointing downwards
            "thumb_curl": 0.0, "index_curl": 1.0, "middle_curl": 1.0, "ring_curl": 1.0, "pinky_curl": 1.0,
            "thumb_spread": -0.8, "finger_spread": 0.0
        },
        "I Love You": {
            # ILY handshape: Thumb, Index, and Pinky fully extended; Middle and Ring curled
            "thumb_curl": 0.0, "index_curl": 0.0, "middle_curl": 1.0, "ring_curl": 1.0, "pinky_curl": 0.0,
            "thumb_spread": 0.7, "finger_spread": 0.4
        },
        "Peace": {
            # Victory / Peace sign: Index and Middle extended in V-shape; Ring, Pinky, Thumb curled
            "thumb_curl": 0.8, "index_curl": 0.0, "middle_curl": 0.0, "ring_curl": 1.0, "pinky_curl": 1.0,
            "thumb_spread": 0.1, "finger_spread": 0.4
        }
    }

    dataset: List[Dict[str, Any]] = []

    for label, params in gesture_definitions.items():
        for i in range(samples_per_gesture):
            # Introduce natural biomechanical variance per recording sample
            tilt_x = np.random.uniform(-0.03, 0.03)
            tilt_y = np.random.uniform(-0.03, 0.03)
            tc = np.clip(params["thumb_curl"] + np.random.uniform(-0.05, 0.05), 0.0, 1.0)
            ic = np.clip(params["index_curl"] + np.random.uniform(-0.05, 0.05), 0.0, 1.0)
            mc = np.clip(params["middle_curl"] + np.random.uniform(-0.05, 0.05), 0.0, 1.0)
            rc = np.clip(params["ring_curl"] + np.random.uniform(-0.05, 0.05), 0.0, 1.0)
            pc = np.clip(params["pinky_curl"] + np.random.uniform(-0.05, 0.05), 0.0, 1.0)
            ts = params["thumb_spread"] + np.random.uniform(-0.04, 0.04)
            fs = params["finger_spread"] + np.random.uniform(-0.03, 0.03)

            landmarks = _create_hand_skeleton(
                thumb_curl=tc,
                index_curl=ic,
                middle_curl=mc,
                ring_curl=rc,
                pinky_curl=pc,
                thumb_spread=ts,
                finger_spread=fs,
                tilt_x=tilt_x,
                tilt_y=tilt_y,
                noise_level=0.012
            )

            dataset.append({
                "label": label,
                "hand_type": "Right",
                "landmarks": landmarks
            })

    return dataset
