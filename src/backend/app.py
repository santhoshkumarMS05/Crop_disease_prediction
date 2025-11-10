# crop_disease/src/backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os, sys, json

# Add model folder to path
sys.path.append(os.path.join(os.path.dirname(__file__), "model"))
from inference import predict

# Import Blueprints
from auth import auth_bp, bcrypt
from history import history_bp

# ------------------ CONFIG ------------------
UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}
DISEASE_JSON = os.path.join("data", "disease_info.json")

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
CORS(app)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Init bcrypt
bcrypt.init_app(app)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(history_bp, url_prefix="/history")

# ------------------ LOAD DISEASE DATA ------------------
try:
    with open(DISEASE_JSON, "r") as f:
        disease_data = json.load(f)
    print(f"✅ Loaded disease data with {len(disease_data)} entries.")
except FileNotFoundError:
    print(f"⚠️ Warning: {DISEASE_JSON} not found. Using empty disease data.")
    disease_data = {}

# ------------------ HELPER ------------------
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# ------------------ PREDICT ROUTE ------------------
@app.route("/predict", methods=["POST"])
def predict_crop():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        if not allowed_file(file.filename):
            return jsonify({"error": "File type not allowed (only PNG, JPG, JPEG)"}), 400

        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)

        # Run model prediction
        result = predict(filepath, topk=3, include_gradcam=True)
        preds = result["predictions"]
        gradcam_image = result.get("gradcam_image", None)

        top1_class = preds[0]["class"]
        top1_info = disease_data.get(top1_class, {
            "crop_name": top1_class,
            "reason": "No detailed info available.",
            "tips": "Consult agricultural experts.",
            "fertilizer": "Use general NPK fertilizer or organic compost."
        })

        response = {
            "success": True,
            "gradcam_image": gradcam_image,
            "top1": {
                "class": top1_info["crop_name"],
                "confidence": round(preds[0]["confidence"], 4),
                "reason": top1_info["reason"],
                "tips": top1_info["tips"],
                "fertilizer": top1_info["fertilizer"]
            }
        }

        if len(preds) > 1:
            response["top2"] = {
                "class": preds[1]["class"],
                "confidence": round(preds[1]["confidence"], 4)
            }

        if len(preds) > 2:
            response["top3"] = {
                "class": preds[2]["class"],
                "confidence": round(preds[2]["confidence"], 4)
            }

        # Remove uploaded file
        try:
            os.remove(filepath)
        except Exception:
            pass

        return jsonify(response)

    except Exception as e:
        print("❌ Error in /predict:", str(e))
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

# ------------------ TEST ROUTE ------------------
@app.route("/test", methods=["GET"])
def test_model():
    try:
        from inference import _model, load_model
        if _model is None:
            model = load_model()
            status = "Model loaded successfully"
        else:
            status = "Model already loaded"

        return jsonify({
            "status": status,
            "total_diseases": len(disease_data),
            "disease_classes": list(disease_data.keys())
        })
    except Exception as e:
        return jsonify({"error": f"Model test failed: {str(e)}"}), 500

# ------------------ HEALTH CHECK ------------------
@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "message": "Crop Disease API is running"})

# ------------------ MAIN ------------------
if __name__ == "__main__":
    print("🚀 Starting Crop Disease Detection API...")
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
