import {
    FilesetResolver,
    HandLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304";

// ======================================================
// ELEMENT HTML
// ======================================================

const video = document.getElementById("camera");
const startButton = document.getElementById("startButton");
const status = document.getElementById("status");
const cameraSelect = document.getElementById("cameraSelect");

// ======================================================
// VARIABLE
// ======================================================

let handLandmarker = null;
let stream = null;

let cameraRunning = false;
let lastVideoTime = -1;

let animationFrame = null;

let blurActive = false;

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

                    minHandDetectionConfidence: 0.35,

                    minHandPresenceConfidence: 0.35,

                    minTrackingConfidence: 0.35
                }
            );

        console.log(
            "✅ MediaPipe berhasil dimuat"
        );

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


    if (!navigator.mediaDevices.getUserMedia) {

        status.innerText =
            "❌ Browser tidak mendukung kamera.";

        return false;
    }


    return true;
}


// ======================================================
// MENCARI KAMERA
// ======================================================

async function getCameras() {

    if (!checkBrowser()) {
        return;
    }

    try {

        status.innerText =
            "⏳ Mencari kamera...";


        // ==============================================
        // MINTA IZIN KAMERA
        // ==============================================

        const tempStream =
            await navigator.mediaDevices.getUserMedia({

                video: true,

                audio: false

            });


        tempStream
            .getTracks()
            .forEach(
                track => track.stop()
            );


        // ==============================================
        // CARI DEVICE
        // ==============================================

        const devices =
            await navigator.mediaDevices.enumerateDevices();


        const cameras =
            devices.filter(
                device =>
                    device.kind === "videoinput"
            );


        // ==============================================
        // RESET SELECT
        // ==============================================

        cameraSelect.innerHTML = "";


        const defaultOption =
            document.createElement("option");


        defaultOption.value = "";


        defaultOption.textContent =
            "📷 Pilih Kamera";


        cameraSelect.appendChild(
            defaultOption
        );


        // ==============================================
        // MASUKKAN KAMERA
        // ==============================================

        cameras.forEach(
            (camera, index) => {

                const option =
                    document.createElement(
                        "option"
                    );


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


        // ==============================================
        // STATUS
        // ==============================================

        if (cameras.length === 0) {

            status.innerText =
                "❌ Kamera tidak ditemukan.";

        }

        else {

            status.innerText =
                `✅ ${cameras.length} kamera ditemukan.`;

        }

    }

    catch (error) {

        console.error(
            "Camera list error:",
            error
        );

        status.innerText =
            "❌ Tidak bisa mengakses kamera.";

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

        status.innerText =
            "⏳ Mengaktifkan kamera...";


        // ==============================================
        // MATIKAN STREAM LAMA
        // ==============================================

        if (stream) {

            stream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );

        }


        // ==============================================
        // AMBIL KAMERA
        // ==============================================

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
                    },

                    facingMode: "user"
                },

                audio: false

            });


        // ==============================================
        // MASUKKAN STREAM KE VIDEO
        // ==============================================

        video.srcObject =
            stream;


        // ==============================================
        // PAKSA VIDEO TAMPIL
        // ==============================================

        video.style.display =
            "block";

        video.style.visibility =
            "visible";

        video.style.opacity =
            "1";

        video.style.filter =
            "none";

        video.style.webkitFilter =
            "none";


        // ==============================================
        // TUNGGU VIDEO SIAP
        // ==============================================

        await new Promise(
            resolve => {

                if (
                    video.readyState >= 2
                ) {

                    resolve();

                }

                else {

                    video.onloadedmetadata =
                        () => {

                            resolve();

                        };

                }

            }
        );


        await video.play();


        console.log(
            "Video width:",
            video.videoWidth
        );

        console.log(
            "Video height:",
            video.videoHeight
        );


        // ==============================================
        // STATUS
        // ==============================================

        cameraRunning =
            true;


        startButton.disabled =
            true;


        startButton.innerText =
            "✅ Kamera Aktif";


        status.innerText =
            "✋ Angkat dua jari ✌️";


        // ==============================================
        // MULAI DETEKSI
        // ==============================================

        detectHands();

    }

    catch (error) {

        console.error(
            "Camera Error:",
            error
        );


        status.innerText =
            "❌ Kamera gagal: " +
            error.name;

    }
}


// ======================================================
// DETEKSI GESTURE ✌️
// ======================================================

function isTwoFingers(landmarks) {

    // ==============================================
    // TELUNJUK
    // ==============================================

    const indexUp =
        landmarks[8].y <
        landmarks[6].y;


    // ==============================================
    // JARI TENGAH
    // ==============================================

    const middleUp =
        landmarks[12].y <
        landmarks[10].y;


    // ==============================================
    // JARI MANIS TURUN
    // ==============================================

    const ringDown =
        landmarks[16].y >
        landmarks[14].y;


    // ==============================================
    // KELINGKING TURUN
    // ==============================================

    const pinkyDown =
        landmarks[20].y >
        landmarks[18].y;


    // ==============================================
    // JARAK TELUNJUK DAN TENGAH
    // ==============================================

    const fingerDistance =
        Math.sqrt(

            Math.pow(
                landmarks[8].x -
                landmarks[12].x,
                2
            )

            +

            Math.pow(
                landmarks[8].y -
                landmarks[12].y,
                2
            )

        );


    const fingersSeparated =
        fingerDistance >
        0.025;


    // ==============================================
    // HASIL
    // ==============================================

    return (

        indexUp &&

        middleUp &&

        ringDown &&

        pinkyDown &&

        fingersSeparated

    );
}


// ======================================================
// AKTIFKAN BLUR
// ======================================================

function enableBlur() {

    if (!blurActive) {

        console.log(
            "❤️ BLUR AKTIF"
        );

    }


    blurActive =
        true;


    // Chrome / Desktop
    video.style.filter =
        "blur(18px)";


    // Chrome / Android / browser mobile
    video.style.webkitFilter =
        "blur(18px)";


    status.innerText =
        "❤️ BLUR AKTIF — ✌️";
}


// ======================================================
// MATIKAN BLUR
// ======================================================

function disableBlur() {

    if (blurActive) {

        console.log(
            "BLUR MATI"
        );

    }


    blurActive =
        false;


    video.style.filter =
        "none";


    video.style.webkitFilter =
        "none";


    status.innerText =
        "✋ Angkat dua jari ✌️";
}


// ======================================================
// DETEKSI TANGAN
// ======================================================

async function detectHands() {

    if (!cameraRunning) {
        return;
    }


    // ==============================================
    // VIDEO SIAP
    // ==============================================

    if (

        video.readyState >= 2 &&

        video.videoWidth > 0 &&

        video.videoHeight > 0

    ) {


        // ==========================================
        // FRAME BARU
        // ==========================================

        if (
            video.currentTime !==
            lastVideoTime
        ) {

            lastVideoTime =
                video.currentTime;


            try {

                // ==================================
                // MEDIAPIPE
                // ==================================

                const results =
                    handLandmarker.detectForVideo(

                        video,

                        performance.now()

                    );


                let twoFingers =
                    false;


                // ==================================
                // TANGAN TERDETEKSI
                // ==================================

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
                        "✋ Tangan:",
                        twoFingers
                    );

                }


                // ==================================
                // GESTURE
                // ==================================

                if (twoFingers) {

                    enableBlur();

                }

                else {

                    disableBlur();

                }

            }

            catch (error) {

                console.error(
                    "Detection Error:",
                    error
                );

            }

        }

    }


    // ==============================================
    // LOOP
    // ==============================================

    animationFrame =
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
// KAMERA BERUBAH
// ======================================================

if (
    navigator.mediaDevices
) {

    navigator.mediaDevices.addEventListener(
        "devicechange",
        async () => {

            console.log(
                "📷 Perangkat kamera berubah"
            );

            await getCameras();

        }
    );

}


// ======================================================
// INITIALIZE
// ======================================================

async function initialize() {

    await loadMediaPipe();

    await getCameras();

}


// ======================================================
// START
// ======================================================

initialize();
