{`import {
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

// LOAD MEDIAPIPE
async function loadMediaPipe() {
    try {
        status.innerText = "⏳ Memuat MediaPipe...";

        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
        );

        handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath:
                    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
            },
            runningMode: "VIDEO",
            numHands: 1,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        status.innerText = "✅ MediaPipe siap. Pilih kamera.";
    } catch (error) {
        console.error(error);
        status.innerText = "❌ MediaPipe gagal dimuat.";
    }
}

// CARI KAMERA
async function getCameras() {
    try {
        const tempStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        tempStream.getTracks().forEach(track => track.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput");

        cameraSelect.innerHTML = "";

        cameras.forEach((camera, index) => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.textContent = camera.label || \`Kamera \${index + 1}\`;
            cameraSelect.appendChild(option);
        });

        status.innerText = \`✅ \${cameras.length} kamera ditemukan.\`;
    } catch (error) {
        console.error(error);
        status.innerText = "❌ Izin kamera ditolak.";
    }
}

// MULAI KAMERA
async function startCamera() {
    try {
        const selectedCamera = cameraSelect.value;

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: { exact: selectedCamera },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        video.srcObject = stream;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;

        await new Promise(resolve => {
            video.onloadedmetadata = resolve;
        });

        await video.play();

        console.log("Ukuran video:", video.videoWidth, video.videoHeight);

        cameraRunning = true;
        startButton.disabled = true;
        startButton.innerText = "✅ Kamera Aktif";
        status.innerText = "✅ Kamera aktif — angkat ✌️";

        detectHands();
    } catch (error) {
        console.error(error);
        status.innerText = "❌ Kamera gagal: " + error.name;
    }
}

// DETEKSI DUA JARI
function isTwoFingers(landmarks) {
    return (
        landmarks[8].y < landmarks[6].y &&
        landmarks[12].y < landmarks[10].y &&
        landmarks[16].y > landmarks[14].y &&
        landmarks[20].y > landmarks[18].y
    );
}

// DETEKSI
function detectHands() {
    if (!cameraRunning) return;

    if (video.readyState >= 2 && video.videoWidth > 0) {
        if (video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;

            const results = handLandmarker.detectForVideo(
                video,
                performance.now()
            );

            let twoFingers = false;

            if (results.landmarks.length > 0) {
                twoFingers = isTwoFingers(results.landmarks[0]);
            }

            if (twoFingers) {
                video.style.filter = "blur(18px)";
                status.innerText = "❤️ BLUR AKTIF — ✌️";
            } else {
                video.style.filter = "none";
                status.innerText = "✋ Angkat dua jari ✌️";
            }
        }
    }

    requestAnimationFrame(detectHands);
}

startButton.addEventListener("click", async () => {
    if (handLandmarker) {
        await startCamera();
    }
});

async function initialize() {
    await loadMediaPipe();
    await getCameras();
}

initialize();`}
