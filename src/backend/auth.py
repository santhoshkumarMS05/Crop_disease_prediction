# crop_disease/src/backend/auth.py
from flask import Blueprint, request, jsonify
from flask_bcrypt import Bcrypt
from pymongo import MongoClient
import jwt, datetime, os
from bson.objectid import ObjectId

bcrypt = Bcrypt()
auth_bp = Blueprint("auth", __name__)

# MongoDB connection
MONGO_URI = "mongodb+srv://luffydb:luffy312@cluster0.oxudhbh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client["crop_disease"]
users = db["users"]

SECRET_KEY = os.environ.get("SECRET_KEY", "MYSECRETKEY")  # change in production

# ---------------- SIGNUP ----------------
@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if users.find_one({"email": email}):
        return jsonify({"error": "Email already exists"}), 400

    hashed_pw = bcrypt.generate_password_hash(password).decode("utf-8")
    users.insert_one({
        "username": username,
        "email": email,
        "password": hashed_pw
    })
    return jsonify({"success": True, "message": "User created successfully"}), 201

# ---------------- LOGIN ----------------
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = users.find_one({"email": email})
    if not user or not bcrypt.check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = jwt.encode({
        "user_id": str(user["_id"]),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, SECRET_KEY, algorithm="HS256")

    return jsonify({"success": True, "token": token, "username": user["username"]})

# ---------------- PROFILE ----------------
@auth_bp.route("/profile", methods=["GET"])
def get_profile():
    token = request.headers.get("Authorization")
    if not token:
        return jsonify({"error": "No token provided"}), 401

    try:
        # Remove "Bearer " prefix if present
        if token.startswith("Bearer "):
            token = token[7:]

        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = decoded.get("user_id")

        # Fetch user info from MongoDB
        user = users.find_one({"_id": ObjectId(user_id)}, {"password": 0})
        if not user:
            return jsonify({"error": "User not found"}), 404

        user["_id"] = str(user["_id"])
        return jsonify({"success": True, "user": user})

    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500
