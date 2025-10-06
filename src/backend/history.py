# crop_disease/src/backend/history.py
from flask import Blueprint, request, jsonify
from pymongo import MongoClient
import jwt
import os
from datetime import datetime
from bson.objectid import ObjectId

history_bp = Blueprint("history", __name__)

MONGO_URI = "mongodb+srv://luffydb:luffy312@cluster0.oxudhbh.mongodb.net/?retryWrites=true&w=majority"
client = MongoClient(MONGO_URI)
db = client["crop_disease"]
predictions_collection = db["predictions"]

SECRET_KEY = os.environ.get("SECRET_KEY", "MYSECRETKEY")

def verify_token(token):
    """Helper function to verify JWT token"""
    try:
        if token.startswith("Bearer "):
            token = token[7:]
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return decoded.get("user_id"), None
    except jwt.ExpiredSignatureError:
        return None, "Token expired"
    except Exception as e:
        return None, str(e)

# Save prediction to history
@history_bp.route("/save", methods=["POST"])
def save_prediction():
    token = request.headers.get("Authorization")
    if not token:
        return jsonify({"error": "No token provided"}), 401

    user_id, error = verify_token(token)
    if error:
        return jsonify({"error": error}), 401

    try:
        data = request.get_json()
        
        # Create prediction document
        prediction_doc = {
            "user_id": user_id,
            "image_base64": data.get("image_base64"),
            "filename": data.get("filename"),
            "disease": data.get("disease"),
            "confidence": data.get("confidence"),
            "reason": data.get("reason"),
            "tips": data.get("tips"),
            "fertilizer": data.get("fertilizer"),
            "top2_class": data.get("top2_class"),
            "top2_confidence": data.get("top2_confidence"),
            "top3_class": data.get("top3_class"),
            "top3_confidence": data.get("top3_confidence"),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        result = predictions_collection.insert_one(prediction_doc)
        
        return jsonify({
            "success": True,
            "message": "Prediction saved successfully",
            "prediction_id": str(result.inserted_id)
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get user prediction history
@history_bp.route("/history", methods=["GET"])
def get_history():
    token = request.headers.get("Authorization")
    if not token:
        return jsonify({"error": "No token provided"}), 401

    user_id, error = verify_token(token)
    if error:
        return jsonify({"error": error}), 401

    try:
        # Get all predictions for user, sorted by newest first
        cursor = predictions_collection.find(
            {"user_id": user_id}
        ).sort("timestamp", -1)
        
        history = []
        for doc in cursor:
            # Convert ObjectId to string and add as prediction_id
            doc['prediction_id'] = str(doc['_id'])
            # Remove the _id field to avoid serialization issues
            del doc['_id']
            history.append(doc)
        
        return jsonify({
            "success": True,
            "history": history,
            "count": len(history)
        })

    except Exception as e:
        print(f"Error in get_history: {str(e)}")  # Debug print
        return jsonify({"error": str(e)}), 500

# Delete a prediction from history
@history_bp.route("/delete/<prediction_id>", methods=["DELETE"])
def delete_prediction(prediction_id):
    token = request.headers.get("Authorization")
    if not token:
        return jsonify({"error": "No token provided"}), 401

    user_id, error = verify_token(token)
    if error:
        return jsonify({"error": error}), 401

    try:
        print(f"Attempting to delete prediction_id: {prediction_id}")  # Debug print
        
        # Validate ObjectId format
        if not ObjectId.is_valid(prediction_id):
            return jsonify({"error": f"Invalid prediction ID format: {prediction_id}"}), 400
        
        result = predictions_collection.delete_one({
            "_id": ObjectId(prediction_id),
            "user_id": user_id  # Ensure user can only delete their own predictions
        })
        
        if result.deleted_count == 0:
            return jsonify({"error": "Prediction not found or unauthorized"}), 404
            
        return jsonify({
            "success": True,
            "message": "Prediction deleted successfully"
        })

    except Exception as e:
        print(f"Error in delete_prediction: {str(e)}")  # Debug print
        return jsonify({"error": str(e)}), 500

# Get statistics
@history_bp.route("/stats", methods=["GET"])
def get_stats():
    token = request.headers.get("Authorization")
    if not token:
        return jsonify({"error": "No token provided"}), 401

    user_id, error = verify_token(token)
    if error:
        return jsonify({"error": error}), 401

    try:
        total_predictions = predictions_collection.count_documents({"user_id": user_id})
        
        healthy_count = predictions_collection.count_documents({
            "user_id": user_id,
            "disease": {"$regex": "healthy", "$options": "i"}
        })
        
        diseased_count = total_predictions - healthy_count
        
        return jsonify({
            "success": True,
            "stats": {
                "total": total_predictions,
                "healthy": healthy_count,
                "diseased": diseased_count
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500