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

let blurState = false;


// ======================================================
// LOAD MEDIAPIPE
// ======================================================

async function loadMediaPipe() {

    try {

        status.innerText =
            "⏳ Memuat MediaPipe...";

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

        console.log("✅ MediaPipe siap");

        status.innerText =
            "✅ MediaPipe siap. Pilih kamera.";

    }

    catch (error) {

        console.error(
            "MediaPipe Error:",
            error
        );

        status.innerText =
            "❌ MediaPipe gagal dimuat.";

    }
}


// ======================================================
// CARI KAMERA
// ======================================================

async function getCameras() {

    try {

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
                device =>
                    device.kind === "videoinput"
            );

        cameraSelect.innerHTML = "";

        const defaultOption =
            document.createElement("option");

        defaultOption.value = "";

        defaultOption.textContent =
            "📷 Pilih Kamera";

        cameraSelect.appendChild(
            defaultOption
        );

        cameras.forEach(
            (camera, index) => {

                const option =
                    document.createElement("option");

                option.value =
                    camera.deviceId;

                option.textContent =
                    camera.label ||
                    `Kamera ${index + 1}`;

                cameraSelect.appendChild(
                    option
                );

            }
        );

        status.innerText =
            `✅ ${cameras.length} kamera ditemukan.`;

    }

    catch (error) {

        console.error(error);

        status.innerText =
            "❌ Tidak bisa membaca kamera.";

    }
}


// ======================================================
// START CAMERA
// ======================================================

async function startCamera() {

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
            "✋ Angkat dua jari ✌️";

        detectHands();

    }

    catch (error) {

        console.error(error);

        status.innerText =
            "❌ Kamera gagal: " +
            error.name;

    }
}


// ======================================================
// DETEKSI GESTURE ✌️
// ======================================================

function isTwoFingers(landmarks) {

    // Telunjuk
    const indexUp =
        landmarks[8].y <
        landmarks[6].y;

    // Jari tengah
    const middleUp =
        landmarks[12].y <
        landmarks[10].y;

    // Jari manis turun
    const ringDown =
        landmarks[16].y >
        landmarks[14].y;

    // Kelingking turun
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
        video.videoWidth > 0 &&
        video.videoHeight > 0
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

                // ======================================
                // ADA TANGAN?
                // ======================================

                if (
                    results.landmarks &&
                    results.landmarks.length > 0
                ) {

                    const landmarks =
                        results.landmarks[0];

                    twoFingers =
                        isTwoFingers(
                            landmarks
                        );

                    console.log(
                        "Tangan terdeteksi:",
                        twoFingers
                    );

                }


                // ======================================
                // AKTIFKAN BLUR
                // ======================================

                if (twoFingers) {

                    if (!blurState) {

                        blurState = true;

                        console.log(
                            "❤️ BLUR AKTIF"
                        );

                    }

                    video.style.filter =
                        "blur(18px)";

                    status.innerText =
                        "❤️ BLUR AKTIF — ✌️";

                }

                // ======================================
                // MATIKAN BLUR
                // ======================================

                else {

                    if (blurState) {

                        blurState = false;

                        console.log(
                            "BLUR MATI"
                        );

                    }

                    video.style.filter =
                        "none";

                    status.innerText =
                        "✋ Angkat dua jari ✌️";

                }

            }

            catch (error) {

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
// TOMBOL
// ======================================================

startButton.addEventListener(
    "click",
    async () => {

        if (!handLandmarker) {

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
