from flask import Flask, render_template, Response
from blur.blur import generate_frames

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/video")
def video():
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


if __name__ == "__main__":
    app.run(debug=True)