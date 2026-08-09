import {
    FilesetResolver,
    HandLandmarker,
    FaceDetector
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304";

const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const startButton = document.getElementById("startButton");
const status = document.getElementById("status");
const cameraSelect = document.getElementById("cameraSelect");

const ctx = canvas.getContext("2d");

let handLandmarker = null;
let faceDetector = null;
let stream = null;
let cameraRunning = false;
let animationFrame = null;
let lastVideoTime = -1;
let blurActive = false;


// ======================================================
// LOAD MEDIAPIPE
// ======================================================

async function loadMediaPipe() {
    try {
        status.innerText = "⏳ Memuat MediaPipe...";

        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
        );

        handLandmarker = await HandLandmarker.createFromOptions(
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

        faceDetector = await FaceDetector.createFromOptions(
            vision,
            {
                baseOptions: {
                    modelAssetPath:
                        "https://storage.googleapis.com/mediapipe-models/face_detector/face_detector/float16/1/face_detector.task"
                },

                runningMode: "VIDEO",

                minDetectionConfidence: 0.5
            }
        );

        status.innerText = "✅ MediaPipe siap. Pilih kamera.";

        console.log("MediaPipe berhasil dimuat");

    } catch (error) {

        console.error(error);

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
            "❌ Kamera membutuhkan HTTPS atau localhost.";
        return false;
    }

    if (!navigator.mediaDevices) {
        status.innerText =
            "❌ Browser tidak menyediakan kamera.";
        return false;
    }

    if (!navigator.mediaDevices.getUserMedia) {
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

        status.innerText = "⏳ Mencari kamera...";

        const tempStream =
            await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });

        tempStream.getTracks().forEach(
            track => track.stop()
        );

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
        defaultOption.textContent = "📷 Pilih Kamera";

        cameraSelect.appendChild(defaultOption);

        cameras.forEach((camera, index) => {

            const option =
                document.createElement("option");

            option.value = camera.deviceId;

            option.textContent =
                camera.label || `Kamera ${index + 1}`;

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
            "❌ Gagal membaca kamera.";
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

            stream.getTracks().forEach(
                track => track.stop()
            );
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

        detect();

    } catch (error) {

        console.error(error);

        status.innerText =
            "❌ Kamera gagal digunakan: " +
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
// BLUR WAJAH
// ======================================================

function blurFace(boundingBox) {

    const x = boundingBox.originX;
    const y = boundingBox.originY;

    const width = boundingBox.width;
    const height = boundingBox.height;

    ctx.save();

    ctx.filter = "blur(18px)";

    ctx.drawImage(
        video,
        x,
        y,
        width,
        height,
        x,
        y,
        width,
        height
    );

    ctx.restore();
}


// ======================================================
// DETEKSI
// ======================================================

async function detect() {

    if (!cameraRunning) {
        return;
    }

    if (
        video.readyState >= 2 &&
        video.videoWidth > 0
    ) {

        if (video.currentTime !== lastVideoTime) {

            lastVideoTime =
                video.currentTime;

            try {

                // ==============================
                // DETEKSI TANGAN
                // ==============================

                const handResults =
                    handLandmarker.detectForVideo(
                        video,
                        performance.now()
                    );

                let twoFingers = false;

                if (
                    handResults.landmarks &&
                    handResults.landmarks.length > 0
                ) {

                    twoFingers =
                        isTwoFingers(
                            handResults.landmarks[0]
                        );
                }


                // ==============================
                // CANVAS
                // ==============================

                canvas.width =
                    video.videoWidth;

                canvas.height =
                    video.videoHeight;

                ctx.clearRect(
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );


                // ==============================
                // GAMBAR VIDEO
                // ==============================

                ctx.drawImage(
                    video,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );


                // ==============================
                // BLUR
                // ==============================

                if (twoFingers) {

                    blurActive = true;

                    status.innerText =
                        "❤️ BLUR AKTIF — ✌️";

                    const faceResults =
                        faceDetector.detectForVideo(
                            video,
                            performance.now()
                        );

                    if (
                        faceResults.detections &&
                        faceResults.detections.length > 0
                    ) {

                        for (
                            const detection
                            of faceResults.detections
                        ) {

                            blurFace(
                                detection.boundingBox
                            );
                        }
                    }

                } else {

                    blurActive = false;

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

    animationFrame =
        requestAnimationFrame(detect);
}


// ======================================================
// EVENT START
// ======================================================

startButton.addEventListener(
    "click",
    async () => {

        if (!handLandmarker || !faceDetector) {

            status.innerText =
                "⏳ MediaPipe belum siap...";

            await loadMediaPipe();
        }

        if (
            handLandmarker &&
            faceDetector
        ) {

            await startCamera();
        }
    }
);


// ======================================================
// DEVICE CAMERA BERUBAH
// ======================================================

navigator.mediaDevices.addEventListener(
    "devicechange",
    async () => {

        await getCameras();
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
