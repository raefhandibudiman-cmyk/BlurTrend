const video = document.getElementById("camera");
const startButton = document.getElementById("startButton");
const status = document.getElementById("status");
const cameraSelect = document.getElementById("cameraSelect");

let stream = null;

// ======================================================
// CEK BROWSER
// ======================================================

function checkBrowser() {
    if (!window.isSecureContext) {
        status.innerText = "❌ Website harus HTTPS.";
        return false;
    }

    if (!navigator.mediaDevices) {
        status.innerText = "❌ Browser tidak mendukung kamera.";
        return false;
    }

    return true;
}

// ======================================================
// CARI KAMERA
// ======================================================

async function getCameras() {

    if (!checkBrowser()) return;

    try {

        status.innerText = "⏳ Mencari kamera...";

        // Minta izin kamera
        const tempStream =
            await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });

        tempStream.getTracks().forEach(track => track.stop());

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

        status.innerText =
            `✅ ${cameras.length} kamera ditemukan.`;

    } catch (error) {

        console.error(error);

        status.innerText =
            "❌ Tidak bisa mengakses kamera.";

    }
}

// ======================================================
// START CAMERA
// ======================================================

async function startCamera() {

    if (!checkBrowser()) return;

    const selectedCamera =
        cameraSelect.value;

    if (!selectedCamera) {

        status.innerText =
            "⚠️ Pilih kamera terlebih dahulu.";

        return;
    }

    try {

        // Matikan kamera sebelumnya
        if (stream) {

            stream.getTracks().forEach(
                track => track.stop()
            );

        }

        // Ambil kamera
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

        console.log("STREAM:", stream);

        // Masukkan stream ke VIDEO
        video.srcObject = stream;

        // Pastikan video terlihat
        video.style.display = "block";
        video.style.visibility = "visible";
        video.style.opacity = "1";
        video.style.filter = "none";

        // Tunggu metadata kamera
        await new Promise(resolve => {

            video.onloadedmetadata = () => {
                resolve();
            };

        });

        console.log(
            "Video width:",
            video.videoWidth
        );

        console.log(
            "Video height:",
            video.videoHeight
        );

        // Play
        await video.play();

        startButton.disabled = true;

        startButton.innerText =
            "✅ Kamera Aktif";

        status.innerText =
            "📷 Kamera sedang aktif";

    } catch (error) {

        console.error(
            "CAMERA ERROR:",
            error
        );

        status.innerText =
            "❌ Kamera gagal: " +
            error.name;
    }
}

// ======================================================
// BUTTON
// ======================================================

startButton.addEventListener(
    "click",
    startCamera
);

// ======================================================
// INITIALIZE
// ======================================================

getCameras();
