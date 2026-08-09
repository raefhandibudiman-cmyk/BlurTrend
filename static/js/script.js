import {
    FilesetResolver,
    HandLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304";

const video = document.getElementById("camera");
const startButton = document.getElementById("startButton");
const status = document.getElementById("status");
const cameraSelect = document.getElementById("cameraSelect");

let handLandmarker = null;
let stream = null;
let cameraRunning = false;
let lastVideoTime = -1;

// ======================================================
// LOAD MEDIAPIPE
// ======================================================

async function loadMediaPipe() {

    try {

        status.innerText = "⏳ Memuat MediaPipe...";

        const vision =
            await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
            );

        handLandmarker =
            await HandLandmarker.createFromOptions(
                vision,
                {
                    baseOptions: {
                        modelAssetPath:
                            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
                    },

                    runningMode: "VIDEO",

                    numHands: 1,

                    minHandDetectionConfidence: 0.5,
                    minHandPresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5
                }
            );

        status.innerText =
            "✅ MediaPipe siap. Pilih kamera.";

        console.log("MediaPipe berhasil dimuat");

    } catch (error) {

        console.error("MediaPipe Error:", error);

        status.innerText =
            "❌ MediaPipe gagal dimuat.";

    }
}

// ======================================================
// CEK BROWSER
// ======================================================

function checkBrowser() {

    if (!window.isSecureContext) {

        status.innerText =
            "❌ Kamera membutuhkan HTTPS.";

        return false;
    }

    if (!navigator.mediaDevices) {

        status.innerText =
            "❌ Browser tidak mendukung kamera.";

        return false;
    }

    return true;
}

// ======================================================
// CARI KAMERA
// ======================================================

async function getCameras() {

    if (!checkBrowser()) {
        return;
    }

    try {

        status.innerText =
            "⏳ Mencari kamera...";

        const tempStream =
            await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });

        tempStream
            .getTracks()
            .forEach(track => track.stop());

        const devices =
            await navigator.mediaDevices.enumerateDevices();

        const cameras =
            devices.filter(
                device => device.kind === "videoinput"
            );

        cameraSelect.innerHTML = "";

        const defaultOption =
            document.createElement("option");

        defaultOption.value = "";
        defaultOption.textContent =
            "📷 Pilih Kamera";

        cameraSelect.appendChild(defaultOption);

        cameras.forEach((camera, index) => {

            const option =
                document.createElement("option");

            option.value =
                camera.deviceId;

            option.textContent =
                camera.label ||
                `Kamera ${index + 1}`;

            cameraSelect.appendChild(option);

        });

        if (cameras.length === 0) {

            status.innerText =
                "❌ Kamera tidak ditemukan.";

        } else {

            status.innerText =
                `✅ ${cameras.length} kamera ditemukan.`;

        }

    } catch (error) {

        console.error(error);

        status.innerText =
            "❌ Izin kamera ditolak.";

    }
}

// ======================================================
// MULAI KAMERA
// ======================================================

async function startCamera() {

    if (!checkBrowser()) {
        return;
    }

    const selectedCamera =
        cameraSelect.value;

    if (!selectedCamera) {

        status.innerText =
            "⚠️ Pilih kamera terlebih dahulu.";

        return;
    }

    try {

        if (stream) {

            stream
                .getTracks()
                .forEach(track => track.stop());

        }

        stream =
            await navigator.mediaDevices.getUserMedia({

                video: {

                    deviceId: {
                        exact: selectedCamera
                    },

                    width: {
                        ideal: 1280
                    },

                    height: {
                        ideal: 720
                    }

                },

                audio: false
            });

        video.srcObject = stream;

        await video.play();

        cameraRunning = true;

        startButton.disabled = true;

        startButton.innerText =
            "✅ Kamera Aktif";

        status.innerText =
            "✅ Kamera aktif — angkat ✌️";

        detectHands();

    } catch (error) {

        console.error(error);

        status.innerText =
            "❌ Kamera gagal: " +
            error.name;

    }
}

// ======================================================
// DETEKSI DUA JARI
// ======================================================

function isTwoFingers(landmarks) {

    const indexUp =
        landmarks[8].y <
        landmarks[6].y;

    const middleUp =
        landmarks[12].y <
        landmarks[10].y;

    const ringDown =
        landmarks[16].y >
        landmarks[14].y;

    const pinkyDown =
        landmarks[20].y >
        landmarks[18].y;

    return (
        indexUp &&
        middleUp &&
        ringDown &&
        pinkyDown
    );
}

// ======================================================
// DETEKSI TANGAN
// ======================================================

async function detectHands() {

    if (!cameraRunning) {
        return;
    }

    if (
        video.readyState >= 2 &&
        video.videoWidth > 0
    ) {

        if (
            video.currentTime !==
            lastVideoTime
        ) {

            lastVideoTime =
                video.currentTime;

            try {

                const results =
                    handLandmarker.detectForVideo(
                        video,
                        performance.now()
                    );

                let twoFingers = false;

                if (
                    results.landmarks &&
                    results.landmarks.length > 0
                ) {

                    twoFingers =
                        isTwoFingers(
                            results.landmarks[0]
                        );

                }

                if (twoFingers) {

                    video.style.filter =
                        "blur(18px)";

                    status.innerText =
                        "❤️ BLUR AKTIF — ✌️";

                } else {

                    video.style.filter =
                        "none";

                    status.innerText =
                        "✋ Angkat dua jari ✌️";

                }

            } catch (error) {

                console.error(
                    "Detection error:",
                    error
                );

            }
        }
    }

    requestAnimationFrame(
        detectHands
    );
}

// ======================================================
// TOMBOL START
// ======================================================

startButton.addEventListener(
    "click",
    async () => {

        if (!handLandmarker) {

            status.innerText =
                "⏳ MediaPipe belum siap...";

            await loadMediaPipe();
        }

        if (handLandmarker) {

            await startCamera();

        }
    }
);

// ======================================================
// INITIALIZE
// ======================================================

async function initialize() {

    await loadMediaPipe();

    await getCameras();

}

initialize();
