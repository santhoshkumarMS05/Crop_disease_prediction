# crop_disease/src/backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os, sys, json
import jwt

# Add model folder to path
sys.path.append(os.path.join(os.path.dirname(__file__), "model"))
from inference import predict

# Import auth blueprint
from auth import auth_bp, bcrypt
# Import history blueprint
from history import history_bp

# -----------------------------
UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}
DISEASE_JSON = os.path.join("data", "disease_info.json")

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app = Flask(__name__)
CORS(app)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Init bcrypt
bcrypt.init_app(app)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(history_bp, url_prefix="/history")

# Load JSON
try:
    with open(DISEASE_JSON, "r") as f:
        disease_data = json.load(f)
    print(f"Successfully loaded disease data with {len(disease_data)} entries")
except FileNotFoundError:
    print(f"Warning: {DISEASE_JSON} not found. Using empty disease data.")
    disease_data = {}

# -----------------------------
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# -----------------------------
@app.route("/predict", methods=["POST"])
def predict_crop():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file part"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No selected file"}), 400

        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            file.save(filepath)

            # Get predictions from model (now includes gradcam_image)
            result = predict(filepath, topk=3, include_gradcam=True)
            top_preds = result['predictions']
            gradcam_image = result['gradcam_image']

            print("Model Predictions:")
            for i, pred in enumerate(top_preds, 1):
                print(f"{i}. {pred['class']} - {pred['confidence']:.4f}")

            # Get top prediction details
            top1_class = top_preds[0]["class"]
            print(f"Looking for class: '{top1_class}'")

            if top1_class in disease_data:
                top1_info = disease_data[top1_class]
                print(f"Found info for: {top1_class}")
            else:
                print(f"No info found for: {top1_class}")
                top1_info = {
                    "crop_name": top1_class,
                    "reason": "No detailed information available for this condition.",
                    "tips": "Please consult with agricultural experts for specific guidance.",
                    "fertilizer": "Use general NPK fertilizer or organic compost."
                }

            response = {
                "success": True,
                "gradcam_image": gradcam_image,  # Add Grad-CAM image
                "top1": {
                    "class": top1_info["crop_name"],
                    "confidence": round(top_preds[0]["confidence"], 4),
                    "reason": top1_info["reason"],
                    "tips": top1_info["tips"],
                    "fertilizer": top1_info["fertilizer"]
                }
            }

            if len(top_preds) > 1:
                response["top2"] = {
                    "class": top_preds[1]["class"],
                    "confidence": round(top_preds[1]["confidence"], 4)
                }

            if len(top_preds) > 2:
                response["top3"] = {
                    "class": top_preds[2]["class"],
                    "confidence": round(top_preds[2]["confidence"], 4)
                }

            try:
                os.remove(filepath)
            except:
                pass

            print("Response with Grad-CAM:", {**response, "gradcam_image": "base64_data..."})
            return jsonify(response)
        else:
            return jsonify({"error": "File type not allowed. Please use PNG, JPG, or JPEG."}), 400

    except Exception as e:
        print(f"Error in prediction: {str(e)}")
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

# -----------------------------
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
            "classes_available": len(disease_data),
            "disease_classes": list(disease_data.keys())
        })
    except Exception as e:
        return jsonify({"error": f"Model test failed: {str(e)}"}), 500

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "message": "Crop Disease API is running"})

# -----------------------------
if __name__ == "__main__":
    print("Starting Crop Disease Detection API...")
    print(f"Upload folder: {UPLOAD_FOLDER}")
    print(f"Disease data file: {DISEASE_JSON}")
    app.run(debug=True, host="0.0.0.0", port=5000)