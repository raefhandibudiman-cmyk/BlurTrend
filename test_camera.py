import cv2

for i in range(5):
    cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)

    if not cap.isOpened():
        print(f"Kamera {i} gagal")
        continue

    ret, frame = cap.read()

    if ret:
        print(f"Kamera {i} BERHASIL")

        cv2.imshow(f"Kamera {i}", frame)

    else:
        print(f"Kamera {i} tidak bisa membaca frame")

    cap.release()

print("Tekan tombol apa saja pada jendela kamera untuk keluar.")
cv2.waitKey(0)
cv2.destroyAllWindows()