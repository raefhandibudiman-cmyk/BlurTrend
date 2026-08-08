import cv2
import mediapipe as mp
import numpy as np
import random
import math
import os


# =========================================================
# MENCARI KAMERA LAPTOP
# =========================================================

cap = None

camera_settings = [
    (0, cv2.CAP_DSHOW),
    (0, cv2.CAP_MSMF),
    (1, cv2.CAP_DSHOW),
    (1, cv2.CAP_MSMF),
    (2, cv2.CAP_DSHOW),
    (2, cv2.CAP_MSMF),
]

for camera_id, backend in camera_settings:

    print(f"Mencoba kamera {camera_id}...")

    test_cap = cv2.VideoCapture(
        camera_id,
        backend
    )

    if not test_cap.isOpened():
        test_cap.release()
        continue

    # Gunakan resolusi kecil dulu supaya stabil
    test_cap.set(
        cv2.CAP_PROP_FRAME_WIDTH,
        640
    )

    test_cap.set(
        cv2.CAP_PROP_FRAME_HEIGHT,
        480
    )

    # Untuk beberapa webcam Windows,
    # MJPG lebih stabil
    test_cap.set(
        cv2.CAP_PROP_FOURCC,
        cv2.VideoWriter_fourcc(*"MJPG")
    )

    # Tunggu kamera
    success = False

    for i in range(15):

        ret, frame = test_cap.read()

        if ret and frame is not None:

            success = True

            print(
                f"Kamera BERHASIL: "
                f"ID={camera_id}, "
                f"Backend={backend}, "
                f"Frame={frame.shape}"
            )

            break

    if success:

        cap = test_cap
        break

    print(
        f"Kamera {camera_id} "
        f"gagal membaca frame"
    )

    test_cap.release()


if cap is None:

    print("================================")
    print("KAMERA TIDAK DITEMUKAN")
    print("================================")

else:

    print("================================")
    print("KAMERA SIAP")
    print("================================")


# =========================================================
# MEDIAPIPE HANDS
# =========================================================

mpHands = mp.solutions.hands

hands = mpHands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.6,
    min_tracking_confidence=0.6
)

mpDraw = mp.solutions.drawing_utils


# =========================================================
# LOAD HEART PNG
# =========================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

heart_path = os.path.join(
    BASE_DIR,
    "static",
    "images",
    "heart.png"
)

heart = cv2.imread(
    heart_path,
    cv2.IMREAD_UNCHANGED
)

print("Heart path:", heart_path)
print("Heart:", heart is not None)
print("Folder kerja:", os.getcwd())

if heart is None:

    print("Gagal membaca heart.png")

else:

    print(
        "Heart berhasil dimuat:",
        heart.shape
    )


# =========================================================
# PARTICLES HEART
# =========================================================

particles = []

TOTAL_PARTICLES = 60

for i in range(TOTAL_PARTICLES):

    particles.append({
        "x": random.randint(0, 640),
        "y": random.randint(0, 480),
        "speed": random.uniform(1, 3),
        "size": random.randint(18, 38),
        "angle": random.randint(0, 360)
    })


# =========================================================
# CACHE HEART
# =========================================================

heart_cache = {}


def get_heart(size):

    if heart is None:
        return None

    if size not in heart_cache:

        heart_cache[size] = cv2.resize(
            heart,
            (size, size),
            interpolation=cv2.INTER_AREA
        )

    return heart_cache[size]


# =========================================================
# OVERLAY PNG
# =========================================================

def overlayPNG(background, overlay, x, y):

    if overlay is None:
        return background

    h, w = overlay.shape[:2]

    # Pastikan tidak keluar layar

    if x < 0:
        return background

    if y < 0:
        return background

    if x + w > background.shape[1]:
        return background

    if y + h > background.shape[0]:
        return background

    # PNG dengan transparansi

    if overlay.shape[2] == 4:

        alpha = (
            overlay[:, :, 3:4]
            .astype(np.float32)
            / 255.0
        )

        foreground = (
            overlay[:, :, :3]
            .astype(np.float32)
        )

        background_part = (
            background[y:y+h, x:x+w]
            .astype(np.float32)
        )

        result = (
            foreground * alpha
            +
            background_part * (1 - alpha)
        )

        background[
            y:y+h,
            x:x+w
        ] = result.astype(np.uint8)

    else:

        background[
            y:y+h,
            x:x+w
        ] = overlay[:, :, :3]

    return background


# =========================================================
# DETEKSI DUA JARI
# =========================================================

def is_two_fingers(handLandmarks):

    lm = handLandmarks.landmark

    # Telunjuk naik

    index_up = (
        lm[8].y < lm[6].y
        and
        lm[8].y < lm[5].y
    )

    # Jari tengah naik

    middle_up = (
        lm[12].y < lm[10].y
        and
        lm[12].y < lm[9].y
    )

    # Jari manis turun

    ring_down = (
        lm[16].y > lm[14].y
    )

    # Kelingking turun

    pinky_down = (
        lm[20].y > lm[18].y
    )

    # Jika membentuk gesture ✌️

    return (
        index_up
        and
        middle_up
        and
        ring_down
        and
        pinky_down
    )


# =========================================================
# FULL BLUR
# =========================================================

def full_blur(frame):

    blur = cv2.GaussianBlur(
        frame,
        (101, 101),
        30
    )

    frame = cv2.addWeighted(
        blur,
        0.96,
        frame,
        0.04,
        0
    )

    return frame


# =========================================================
# HEART PARTICLES
# =========================================================

def drawParticles(frame):

    global particles

    h, w = frame.shape[:2]

    for p in particles:

        # Gerakan horizontal sedikit

        p["angle"] += 2

        p["x"] += (
            math.sin(
                math.radians(
                    p["angle"]
                )
            ) * 0.8
        )

        # Bergerak ke atas

        p["y"] -= p["speed"]

        size = p["size"]

        heart_img = get_heart(size)

        frame = overlayPNG(
            frame,
            heart_img,
            int(p["x"]),
            int(p["y"])
        )

        # Jika keluar layar,
        # muncul kembali dari bawah

        if p["y"] < -60:

            p["y"] = (
                h +
                random.randint(
                    20,
                    150
                )
            )

            p["x"] = random.randint(
                0,
                w
            )

            p["speed"] = random.uniform(
                1,
                3
            )

            p["size"] = random.randint(
                18,
                38
            )

            p["angle"] = random.randint(
                0,
                360
            )

    return frame


# =========================================================
# PROSES GESTURE
# =========================================================

def checkGesture(frame):

    # BGR → RGB

    rgb = cv2.cvtColor(
        frame,
        cv2.COLOR_BGR2RGB
    )

    # MediaPipe

    results = hands.process(rgb)

    blurMode = False

    # Jika tangan terdeteksi

    if results.multi_hand_landmarks:

        for handLms in results.multi_hand_landmarks:

            # Gambar landmark tangan

            mpDraw.draw_landmarks(
                frame,
                handLms,
                mpHands.HAND_CONNECTIONS
            )

            # Cek gesture dua jari

            if is_two_fingers(handLms):

                blurMode = True

    return frame, blurMode


# =========================================================
# STATUS DI LAYAR
# =========================================================

def drawStatus(frame, blurMode):

    if blurMode:

        text = "BLUR ON - ❤️"

        cv2.putText(
            frame,
            text,
            (20, 45),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 255, 0),
            3
        )

    else:

        text = "Angkat 2 Jari ✌️"

        cv2.putText(
            frame,
            text,
            (20, 45),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (255, 255, 255),
            2
        )

    return frame


# =========================================================
# GENERATE FRAME UNTUK FLASK
# =========================================================
def generate_frames():

    global cap

    if cap is None:

        print("Kamera tidak tersedia")

        return

    while True:

        success, frame = cap.read()

        if not success or frame is None:

            print("Gagal membaca kamera")

            continue

        # Pastikan frame benar-benar punya 3 channel
        if len(frame.shape) != 3:

            print("Frame kamera tidak valid")

            continue

        # Mirror
        frame = cv2.flip(frame, 1)

        # Deteksi gesture
        displayFrame, blurMode = checkGesture(frame)

        # Jika ✌️
        if blurMode:

            # Blur
            displayFrame = full_blur(
                displayFrame
            )

            # Heart
            displayFrame = drawParticles(
                displayFrame
            )

        # Status
        displayFrame = drawStatus(
            displayFrame,
            blurMode
        )

        # JPEG
        ret, buffer = cv2.imencode(
            ".jpg",
            displayFrame,
            [
                cv2.IMWRITE_JPEG_QUALITY,
                85
            ]
        )

        if not ret:

            print("JPEG gagal dibuat")

            continue

        frame_bytes = buffer.tobytes()

        # MJPEG
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n"
            b"Content-Length: "
            + str(len(frame_bytes)).encode()
            + b"\r\n\r\n"
            + frame_bytes
            + b"\r\n"
        )