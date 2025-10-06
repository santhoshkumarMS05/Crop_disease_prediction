# crop_disease/src/backend/model/inference.py
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import numpy as np
import cv2
import os
import base64
from io import BytesIO

# -----------------------------
# CONFIG
# -----------------------------
MODEL_PATH = os.path.join(os.path.dirname(__file__), "my_mobilenetv3_large_final_model.pth")
IMG_SIZE = 224
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Updated class names to exactly match disease_info.json keys
class_names = [
    'Bacterialblight rice',
    'Brownspot rice', 
    'Commonrust corn',
    'Earlyblight tomato',
    'Grayspot corn',
    'Healthy corn',
    'Healthy rice',
    'Healthy tomato',
    'Lateblight tomato',
    'Leafblast rice',
    'Leafblight corn',
    'Yellowleafcurlyvirus tomato'
]

NUM_CLASSES = len(class_names)
NUM_TTA = 5
TEMPERATURE = 1.0

# -----------------------------
# GRAD-CAM CLASS (EXACT FROM NOTEBOOK)
# -----------------------------
class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        self._register_hooks()

    def _register_hooks(self):
        def forward_hook(module, inp, out):
            self.activations = out.detach()

        def backward_hook(module, grad_input, grad_output):
            self.gradients = grad_output[0].detach()

        # Forward hook
        self.target_layer.register_forward_hook(forward_hook)
        # Backward hook (full, works in PyTorch 2+)
        try:
            self.target_layer.register_full_backward_hook(backward_hook)
        except:
            self.target_layer.register_backward_hook(backward_hook)

    def generate(self, input_tensor, class_idx=None, gamma=0.7):
        # Model stays in eval mode, but we need gradients
        output = self.model(input_tensor)

        if class_idx is None:
            class_idx = output.argmax(dim=1).item()

        self.model.zero_grad()
        score = output[0, class_idx]
        score.backward(retain_graph=True)

        # Get hooked data
        gradients = self.gradients.cpu().numpy()[0]      # (C, H, W)
        activations = self.activations.cpu().numpy()[0]  # (C, H, W)

        # Global average pooling on gradients
        weights = gradients.mean(axis=(1, 2))  # (C,)
        cam = np.zeros(activations.shape[1:], dtype=np.float32)

        for i, w in enumerate(weights):
            cam += w * activations[i]

        cam = np.maximum(cam, 0)
        cam = cv2.resize(cam, (224, 224))
        cam = cam - cam.min()
        if cam.max() > 0:
            cam = cam / cam.max()
        cam = np.power(cam, gamma)  # gamma correction
        return cam, class_idx

# -----------------------------
# GET LAST CONV LAYER (EXACT FROM NOTEBOOK)
# -----------------------------
def get_last_conv_layer(model):
    for layer in reversed(model.features):
        if isinstance(layer, torch.nn.Conv2d):
            return layer
        for sub in layer.modules():
            if isinstance(sub, torch.nn.Conv2d):
                return sub
    raise ValueError("No Conv2d layer found in model.features!")

# -----------------------------
# GENERATE GRAD-CAM OVERLAY (EXACT FROM NOTEBOOK)
# -----------------------------
def generate_gradcam_overlay(model, input_tensor, orig_img_pil, class_idx):
    """
    Generate Grad-CAM heatmap overlay - matches notebook implementation exactly
    """
    try:
        target_layer = get_last_conv_layer(model)
        print(f"Using target layer: {target_layer}")
        
        # Create GradCAM and generate heatmap
        gradcam = GradCAM(model, target_layer)
        cam, _ = gradcam.generate(input_tensor, class_idx=class_idx)
        
        # Prepare original image (exactly as in notebook)
        orig_np = np.array(orig_img_pil.resize((224, 224))).astype(np.float32) / 255.0
        
        # Overlay on original image (EXACT notebook code)
        heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
        heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB) / 255.0
        overlay = 0.5 * heatmap + 0.5 * orig_np
        overlay = overlay / overlay.max()
        
        # Convert to uint8 for image encoding
        overlay_img = np.uint8(255 * overlay)
        
        # Convert to base64
        overlay_pil = Image.fromarray(overlay_img)
        buffer = BytesIO()
        overlay_pil.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        print(f"Grad-CAM generated successfully for class {class_idx}")
        return f"data:image/png;base64,{img_str}"
    
    except Exception as e:
        print(f"Error generating Grad-CAM: {e}")
        import traceback
        traceback.print_exc()
        return None

# -----------------------------
# MODEL LOADER
# -----------------------------
def load_model():
    """Load the trained MobileNetV3 model"""
    print(f"Loading model from: {MODEL_PATH}")
    print(f"Using device: {DEVICE}")
    
    model = models.mobilenet_v3_large(weights=None)
    in_features = model.classifier[0].in_features
    model.classifier = nn.Sequential(
        nn.Linear(in_features, 1024),
        nn.Hardswish(),
        nn.Dropout(0.3),
        nn.Linear(1024, NUM_CLASSES)
    )
    
    try:
        model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
        print("Model weights loaded successfully")
    except Exception as e:
        print(f"Error loading model weights: {e}")
        raise
    
    model.to(DEVICE)
    model.eval()
    print(f"Model loaded with {NUM_CLASSES} classes")
    return model

# -----------------------------
# TRANSFORMS (MATCH NOTEBOOK)
# -----------------------------
base_tfms = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

tta_tfms = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(20),
    transforms.ColorJitter(0.2, 0.2, 0.2, 0.05),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# -----------------------------
# PREDICTION FUNCTION
# -----------------------------
_model = None

def predict(image_path, topk=3, include_gradcam=True):
    """
    Predict crop disease from image with Test Time Augmentation (TTA) and Grad-CAM
    """
    global _model
    
    if _model is None:
        print("Loading model for first time...")
        _model = load_model()
    
    try:
        img = Image.open(image_path).convert("RGB")
        print(f"Processing image: {image_path}")
        print(f"Image size: {img.size}")
        
        all_probs = []

        # Base prediction (no augmentation) - with no_grad for prediction
        input_tensor = base_tfms(img).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            outputs = _model(input_tensor) / TEMPERATURE
            probs = torch.softmax(outputs, dim=1).cpu().numpy()[0]
            all_probs.append(probs)

        # TTA predictions
        for i in range(NUM_TTA):
            aug_tensor = tta_tfms(img).unsqueeze(0).to(DEVICE)
            with torch.no_grad():
                outputs = _model(aug_tensor) / TEMPERATURE
                probs = torch.softmax(outputs, dim=1).cpu().numpy()[0]
                all_probs.append(probs)

        # Average all predictions
        final_probs = np.mean(all_probs, axis=0)
        
        # Get top-k predictions
        sorted_idx = np.argsort(final_probs)[::-1][:topk]

        # Format results
        results = []
        for idx in sorted_idx:
            results.append({
                "class": class_names[idx],
                "confidence": float(final_probs[idx])
            })
        
        # Generate Grad-CAM for top prediction
        gradcam_image = None
        if include_gradcam:
            top_class_idx = sorted_idx[0]
            print(f"Generating Grad-CAM for class index {top_class_idx} ({class_names[top_class_idx]})")
            
            # Create NEW tensor for Grad-CAM (with gradients enabled)
            input_tensor_gradcam = base_tfms(img).unsqueeze(0).to(DEVICE)
            input_tensor_gradcam.requires_grad_(True)  # Enable gradients
            
            gradcam_image = generate_gradcam_overlay(_model, input_tensor_gradcam, img, top_class_idx)
        
        print("Prediction Results:")
        for i, result in enumerate(results, 1):
            print(f"{i}. {result['class']} - {result['confidence']:.4f} ({result['confidence']*100:.2f}%)")
        
        return {
            "predictions": results,
            "gradcam_image": gradcam_image
        }
        
    except Exception as e:
        print(f"Error during prediction: {e}")
        import traceback
        traceback.print_exc()
        raise

# -----------------------------
# UTILITY FUNCTIONS
# -----------------------------
def get_class_names():
    """Return list of all class names"""
    return class_names.copy()

def get_model_info():
    """Return model information"""
    return {
        "num_classes": NUM_CLASSES,
        "class_names": class_names,
        "img_size": IMG_SIZE,
        "device": str(DEVICE),
        "model_path": MODEL_PATH,
        "tta_augmentations": NUM_TTA
    }

# -----------------------------
# TEST
# -----------------------------
if __name__ == "__main__":
    test_image = "sample.jpg"
    
    if os.path.exists(test_image):
        print("Testing model...")
        try:
            result = predict(test_image, include_gradcam=True)
            print("\nTop Predictions (with TTA):")
            for i, p in enumerate(result['predictions'], 1):
                print(f"{i}. {p['class']} - {p['confidence']:.4f} ({p['confidence']*100:.2f}%)")
            print(f"\nGrad-CAM generated: {result['gradcam_image'] is not None}")
        except Exception as e:
            print(f"Test failed: {e}")
    else:
        print(f"Test image '{test_image}' not found")