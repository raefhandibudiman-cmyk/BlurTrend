// ======================================================
// BLURTREND
// CAMERA SELECTOR
// MEDIAPIPE HAND DETECTION
// GESTURE ✌️
// BLUR + ❤️
// ======================================================


// ======================================================
// IMPORT MEDIAPIPE
// ======================================================

import {
    FilesetResolver,
    HandLandmarker
}
from
"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304";


// ======================================================
// ELEMENT HTML
// ======================================================

const video =
    document.getElementById(
        "camera"
    );


const canvas =
    document.getElementById(
        "canvas"
    );


const startButton =
    document.getElementById(
        "startButton"
    );


const status =
    document.getElementById(
        "status"
    );


const cameraSelect =
    document.getElementById(
        "cameraSelect"
    );


// ======================================================
// VARIABLE
// ======================================================

let handLandmarker =
    null;


let cameraRunning =
    false;


let lastVideoTime =
    -1;


let animationFrame =
    null;


let stream =
    null;


// ======================================================
// HEART
// ======================================================

let hearts = [];


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


                    runningMode:
                        "VIDEO",


                    numHands:
                        1,


                    minHandDetectionConfidence:
                        0.5,


                    minHandPresenceConfidence:
                        0.5,


                    minTrackingConfidence:
                        0.5

                }

            );


        console.log(
            "MediaPipe berhasil dimuat"
        );


        status.innerText =
            "✅ Pilih kamera terlebih dahulu";


    }

    catch (error) {

        console.error(
            "MediaPipe Error:",
            error
        );


        status.innerText =
            "❌ MediaPipe gagal dimuat";

    }

}


// ======================================================
// CEK BROWSER
// ======================================================

function checkBrowser() {


    if (
        !window.isSecureContext
    ) {

        status.innerText =
            "❌ Kamera membutuhkan HTTPS atau localhost.";

        return false;

    }


    if (
        !navigator.mediaDevices
    ) {

        status.innerText =
            "❌ Browser tidak menyediakan mediaDevices.";

        return false;

    }


    if (
        !navigator.mediaDevices.getUserMedia
    ) {

        status.innerText =
            "❌ Browser tidak mendukung kamera.";

        return false;

    }


    return true;

}


// ======================================================
// MENCARI SEMUA KAMERA
// ======================================================

async function getCameras() {

    try {

        if (!checkBrowser()) {

            return;

        }


        status.innerText =
            "⏳ Mencari kamera...";


        // ==============================================
        // MINTA IZIN SEMENTARA
        // ==============================================

        const tempStream =
            await navigator.mediaDevices
                .getUserMedia({

                    video: true,

                    audio: false

                });


        // Matikan stream sementara

        tempStream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );


        // ==============================================
        // CARI DEVICE
        // ==============================================

        const devices =
            await navigator.mediaDevices
                .enumerateDevices();


        const cameras =
            devices.filter(

                device =>
                    device.kind ===
                    "videoinput"

            );


        console.log(
            "Daftar kamera:",
            cameras
        );


        // ==============================================
        // KOSONGKAN SELECT
        // ==============================================

        cameraSelect.innerHTML =
            "";


        // ==============================================
        // OPTION DEFAULT
        // ==============================================

        const defaultOption =
            document.createElement(
                "option"
            );


        defaultOption.value =
            "";


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


                let cameraName =
                    camera.label;


                if (
                    !cameraName
                ) {

                    cameraName =
                        `Kamera ${index + 1}`;

                }


                option.textContent =
                    cameraName;


                cameraSelect.appendChild(
                    option
                );


            }

        );


        // ==============================================
        // STATUS
        // ==============================================

        if (
            cameras.length === 0
        ) {

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
            "Gagal membaca kamera:",
            error
        );


        if (
            error.name ===
            "NotAllowedError"
        ) {

            status.innerText =
                "❌ Izin kamera ditolak.";

        }

        else {

            status.innerText =
                "❌ Gagal membaca daftar kamera.";

        }

    }

}


// ======================================================
// MULAI KAMERA
// ======================================================

async function startCamera() {


    if (
        !checkBrowser()
    ) {

        return;

    }


    // ==============================================
    // CEK PILIHAN
    // ==============================================

    const selectedCamera =
        cameraSelect.value;


    if (
        !selectedCamera
    ) {

        status.innerText =
            "⚠️ Silakan pilih kamera terlebih dahulu.";

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
        // AMBIL KAMERA YANG DIPILIH
        // ==============================================

        stream =
            await navigator.mediaDevices
                .getUserMedia({

                    video: {

                        deviceId: {

                            exact:
                                selectedCamera

                        },


                        width: {

                            ideal:
                                1280

                        },


                        height: {

                            ideal:
                                720

                        }

                    },


                    audio: false

                });


        // ==============================================
        // MASUKKAN KE VIDEO
        // ==============================================

        video.srcObject =
            stream;


        await video.play();


        cameraRunning =
            true;


        startButton.disabled =
            true;


        startButton.innerText =
            "✅ Kamera Aktif";


        status.innerText =
            "✅ Kamera aktif — angkat ✌️";


        // ==============================================
        // MULAI DETEKSI
        // ==============================================

        detectHands();


    }

    catch (error) {

        console.error(
            "ERROR KAMERA:",
            error
        );


        console.error(
            "Nama:",
            error.name
        );


        console.error(
            "Pesan:",
            error.message
        );


        // ==============================================
        // ERROR
        // ==============================================

        if (
            error.name ===
            "NotAllowedError"
        ) {

            status.innerText =
                "❌ Kamera ditolak. Izinkan kamera.";

        }

        else if (
            error.name ===
            "NotFoundError"
        ) {

            status.innerText =
                "❌ Kamera tidak ditemukan.";

        }

        else if (
            error.name ===
            "NotReadableError"
        ) {

            status.innerText =
                "❌ Kamera sedang digunakan aplikasi lain.";

        }

        else if (
            error.name ===
            "OverconstrainedError"
        ) {

            status.innerText =
                "❌ Kamera yang dipilih tidak tersedia.";

        }

        else if (
            error.name ===
            "SecurityError"
        ) {

            status.innerText =
                "❌ Browser memblokir kamera.";

        }

        else if (
            error.name ===
            "TypeError"
        ) {

            status.innerText =
                "❌ Kamera membutuhkan HTTPS atau localhost.";

        }

        else {

            status.innerText =
                "❌ Kamera gagal: " +
                error.name;

        }

    }

}


// ======================================================
// DETEKSI DUA JARI ✌️
// ======================================================

function isTwoFingers(
    landmarks
) {


    // ==============================================
    // TELUNJUK
    // ==============================================

    const indexUp =
        landmarks[8].y <
        landmarks[6].y;


    // ==============================================
    // TENGAH
    // ==============================================

    const middleUp =
        landmarks[12].y <
        landmarks[10].y;


    // ==============================================
    // MANIS TURUN
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


    return (

        indexUp &&

        middleUp &&

        ringDown &&

        pinkyDown

    );

}


// ======================================================
// BUAT HEART
// ======================================================

function createHeart() {


    hearts.push({

        x:
            Math.random() *
            window.innerWidth,


        y:
            window.innerHeight +
            50,


        size:
            15 +
            Math.random() *
            30,


        speed:
            1 +
            Math.random() *
            3,


        rotation:
            Math.random() *
            360,


        rotationSpeed:
            -2 +
            Math.random() *
            4,


        opacity:
            0.6 +
            Math.random() *
            0.4

    });

}


// ======================================================
// EFEK HEART
// ======================================================

function drawHearts() {


    // Tambahkan heart secara acak

    if (
        Math.random() <
        0.12
    ) {

        createHeart();

    }


    // Hapus heart yang keluar

    hearts =
        hearts.filter(

            heart =>
                heart.y >
                -100

        );


    // Update

    hearts.forEach(

        heart => {

            heart.y -=
                heart.speed;


            heart.rotation +=
                heart.rotationSpeed;

        }

    );

}


// ======================================================
// BLUR AKTIF
// ======================================================

function enableBlur() {


    video.style.filter =
        "blur(18px)";


    video.style.transition =
        "filter 0.2s ease";


    status.innerText =
        "❤️ BLUR AKTIF — ✌️";


    // Tambah heart

    createHeart();

    createHeart();

}


// ======================================================
// BLUR MATI
// ======================================================

function disableBlur() {


    video.style.filter =
        "none";


    status.innerText =
        "✌️ Angkat dua jari";


}


// ======================================================
// DETEKSI TANGAN
// ======================================================

async function detectHands() {


    if (
        !cameraRunning
    ) {

        return;

    }


    // Pastikan video siap

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


                // ======================================
                // MEDIAPIPE
                // ======================================

                const results =
                    handLandmarker
                        .detectForVideo(

                            video,

                            performance.now()

                        );


                let twoFingers =
                    false;


                // ======================================
                // TANGAN TERDETEKSI
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

                }


                // ======================================
                // GESTURE
                // ======================================

                if (
                    twoFingers
                ) {

                    enableBlur();


                }

                else {

                    disableBlur();

                }


            }

            catch (error) {

                console.error(
                    "Hand detection error:",
                    error
                );

            }

        }

    }


    // ==============================================
    // ANIMASI
    // ==============================================

    drawHearts();


    // ==============================================
    // LOOP
    // ==============================================

    animationFrame =
        requestAnimationFrame(
            detectHands
        );

}


// ======================================================
// STOP CAMERA
// ======================================================

function stopCamera() {


    cameraRunning =
        false;


    if (
        animationFrame
    ) {

        cancelAnimationFrame(
            animationFrame
        );

    }


    if (
        stream
    ) {

        stream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );

    }


    video.srcObject =
        null;


    video.style.filter =
        "none";


    startButton.disabled =
        false;


    startButton.innerText =
        "📷 Nyalakan Kamera";


    status.innerText =
        "Kamera dimatikan";

}


// ======================================================
// EVENT BUTTON
// ======================================================

startButton.addEventListener(

    "click",

    async function() {


        // ==========================================
        // CEK MEDIAPIPE
        // ==========================================

        if (
            !handLandmarker
        ) {

            status.innerText =
                "⏳ MediaPipe belum siap...";


            await loadMediaPipe();

        }


        // ==========================================
        // START
        // ==========================================

        if (
            handLandmarker
        ) {

            await startCamera();

        }

    }

);


// ======================================================
// EVENT PERUBAHAN DEVICE
// ======================================================

navigator.mediaDevices
    .addEventListener(

        "devicechange",

        async function() {

            console.log(
                "Perangkat kamera berubah"
            );


            await getCameras();

        }

    );


// ======================================================
// LOAD AWAL
// ======================================================

async function initialize() {


    await loadMediaPipe();


    await getCameras();

}


// ======================================================
// MULAI WEBSITE
// ======================================================

initialize();


// ======================================================
// LOG
// ======================================================

console.log(
    "===================================="
);


console.log(
    "❤️ BLURTREND"
);


console.log(
    "Camera + MediaPipe + Gesture ✌️"
);


console.log(
    "===================================="
);