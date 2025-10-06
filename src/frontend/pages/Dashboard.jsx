// crop_disease/src/frontend/pages/Dashboard.jsx
import React, { useState } from "react";

const Dashboard = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [processingFile, setProcessingFile] = useState("");
  const [uploadMode, setUploadMode] = useState("single");
  const [savingStatus, setSavingStatus] = useState({}); // Track save status per prediction

  const token = localStorage.getItem("token");

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);

    if (uploadMode === "single" && files.length > 1) {
      alert("Single mode: Please select only one image");
      return;
    }

    if (uploadMode === "batch" && files.length > 10) {
      alert("Batch mode: Maximum 10 images allowed");
      return;
    }

    const fileObjects = files.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: URL.createObjectURL(file),
      status: "pending",
      prediction: null,
    }));

    setSelectedFiles(fileObjects);
    setPredictions([]);
  };

  const removeFile = (id) => {
    setSelectedFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      prev
        .filter((f) => f.id === id)
        .forEach((f) => URL.revokeObjectURL(f.preview));
      return updated;
    });
  };

  const getSeverityRating = (className, confidence) => {
    const isHealthy = className.toLowerCase().includes("healthy");

    if (isHealthy) {
      return {
        level: "Low",
        color: "text-green-600 bg-green-100",
        icon: "🟢",
        description: "Healthy crop",
      };
    }

    if (confidence >= 0.8) {
      return {
        level: "High",
        color: "text-red-600 bg-red-100",
        icon: "🔴",
        description: "Immediate attention required",
      };
    } else if (confidence >= 0.6) {
      return {
        level: "Medium",
        color: "text-yellow-600 bg-yellow-100",
        icon: "🟡",
        description: "Monitor closely",
      };
    } else {
      return {
        level: "Low",
        color: "text-blue-600 bg-blue-100",
        icon: "🔵",
        description: "Uncertain diagnosis",
      };
    }
  };

  // Save prediction to history
  // Save prediction to history
  const savePrediction = async (result) => {
    if (!token) {
      alert("Please login to save predictions");
      return;
    }

    setSavingStatus((prev) => ({ ...prev, [result.id]: "saving" }));

    try {
      // Convert image to base64
      const imageBase64 = await fileToBase64(result.file);

      const saveData = {
        image_base64: imageBase64, // Changed from image_url to image_base64
        filename: result.file.name,
        disease: result.prediction.top1.class,
        confidence: result.prediction.top1.confidence,
        reason: result.prediction.top1.reason,
        tips: result.prediction.top1.tips,
        fertilizer: result.prediction.top1.fertilizer,
        top2_class: result.prediction.top2.class,
        top2_confidence: result.prediction.top2.confidence,
        top3_class: result.prediction.top3.class,
        top3_confidence: result.prediction.top3.confidence,
      };

      const res = await fetch("http://127.0.0.1:5000/history/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(saveData),
      });

      const data = await res.json();

      if (res.ok) {
        setSavingStatus((prev) => ({ ...prev, [result.id]: "saved" }));
        setTimeout(() => {
          setSavingStatus((prev) => ({ ...prev, [result.id]: null }));
        }, 2000);
      } else {
        throw new Error(data.error || "Failed to save");
      }
    } catch (err) {
      console.error("Error saving prediction:", err);
      setSavingStatus((prev) => ({ ...prev, [result.id]: "error" }));
      alert("Failed to save prediction: " + err.message);
    }
  };

  // Add this helper function to convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setLoading(true);
    setCurrentProgress(0);
    const results = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const fileObj = selectedFiles[i];
      setProcessingFile(fileObj.file.name);
      setCurrentProgress((i / selectedFiles.length) * 100);

      setSelectedFiles((prev) =>
        prev.map((f) =>
          f.id === fileObj.id ? { ...f, status: "processing" } : f
        )
      );

      const formData = new FormData();
      formData.append("file", fileObj.file);

      try {
        const res = await fetch("http://127.0.0.1:5000/predict", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Network response not ok");
        const data = await res.json();

        results.push({
          ...fileObj,
          prediction: data,
          status: "completed",
        });

        setSelectedFiles((prev) =>
          prev.map((f) =>
            f.id === fileObj.id
              ? { ...f, status: "completed", prediction: data }
              : f
          )
        );
      } catch (err) {
        console.error("Error:", err);
        results.push({
          ...fileObj,
          status: "error",
          error: "Analysis failed",
        });

        setSelectedFiles((prev) =>
          prev.map((f) => (f.id === fileObj.id ? { ...f, status: "error" } : f))
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setCurrentProgress(100);
    setPredictions(results);
    setLoading(false);
    setProcessingFile("");
  };

  const getHealthStatusColor = (className) => {
    if (className.toLowerCase().includes("healthy")) {
      return "text-green-700 bg-green-100 border-green-200";
    } else {
      return "text-red-700 bg-red-100 border-red-200";
    }
  };

  const getDiseaseEmoji = (className) => {
    const lower = className.toLowerCase();
    if (lower.includes("healthy")) return "🌱";
    if (lower.includes("rice")) return "🌾";
    if (lower.includes("tomato")) return "🍅";
    if (lower.includes("corn")) return "🌽";
    if (lower.includes("blast") || lower.includes("blight")) return "🦠";
    if (lower.includes("rust") || lower.includes("spot")) return "🍂";
    if (lower.includes("virus")) return "🔬";
    return "🌿";
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return "⏳";
      case "processing":
        return "🔄";
      case "completed":
        return "✅";
      case "error":
        return "❌";
      default:
        return "📁";
    }
  };

  const getSaveButtonContent = (resultId) => {
    const status = savingStatus[resultId];
    switch (status) {
      case "saving":
        return (
          <span className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Saving...</span>
          </span>
        );
      case "saved":
        return <span>✓ Saved</span>;
      case "error":
        return <span>❌ Failed</span>;
      default:
        return <span>💾 Save to History</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <div>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Icon */}
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                🌿
              </div>
              {/* Title & Subtitle */}
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
                  Crop Health Dashboard
                </h1>
                <p className="text-sm text-gray-600 font-medium">
                  Upload images and analyze your crops’ health
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Upload Mode Toggle */}
        <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex items-center justify-center space-x-4">
              <span className="text-gray-700 font-medium">Upload Mode:</span>
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setUploadMode("single")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    uploadMode === "single"
                      ? "bg-emerald-600 text-white shadow-md"
                      : "text-gray-600 hover:text-emerald-600"
                  }`}
                >
                  📷 Single Image
                </button>
                <button
                  onClick={() => setUploadMode("batch")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    uploadMode === "batch"
                      ? "bg-emerald-600 text-white shadow-md"
                      : "text-gray-600 hover:text-emerald-600"
                  }`}
                >
                  📚 Batch Upload
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
              <span>📸</span>
              <span>
                Upload Crop {uploadMode === "batch" ? "Images" : "Image"}
              </span>
            </h2>
            <p className="text-emerald-100 mt-2">
              {uploadMode === "single"
                ? "Upload a clear image of your crop for instant health analysis"
                : "Upload up to 10 images for batch analysis"}
            </p>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload Area */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple={uploadMode === "batch"}
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-3 border-dashed border-emerald-300 rounded-xl hover:border-emerald-500 transition-all duration-300 cursor-pointer bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg">
                      {uploadMode === "batch" ? "📚" : "📷"}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">
                      {uploadMode === "single"
                        ? "Choose crop image"
                        : "Choose multiple images"}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {uploadMode === "single"
                        ? "PNG, JPG, JPEG • Max 10MB"
                        : "Up to 10 images • PNG, JPG, JPEG"}
                    </p>
                  </div>
                </label>
              </div>

              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Selected Files ({selectedFiles.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto">
                    {selectedFiles.map((fileObj) => (
                      <div
                        key={fileObj.id}
                        className="bg-gray-50 rounded-xl p-3 border border-gray-200"
                      >
                        <div className="relative mb-3">
                          <img
                            src={fileObj.preview}
                            alt={fileObj.file.name}
                            className="w-full h-24 object-contain rounded-lg bg-white"
                          />
                          <div className="absolute top-1 right-1 flex space-x-1">
                            <span className="bg-white/90 rounded-full w-6 h-6 flex items-center justify-center text-sm">
                              {getStatusIcon(fileObj.status)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFile(fileObj.id)}
                              className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <p className="font-medium text-gray-800 text-sm truncate">
                          {fileObj.file.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {(fileObj.file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {loading && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-800 font-medium">
                      Analyzing Images...
                    </span>
                    <span className="text-blue-600 text-sm">
                      {Math.round(currentProgress)}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${currentProgress}%` }}
                    ></div>
                  </div>
                  {processingFile && (
                    <p className="text-blue-600 text-sm mt-2">
                      Processing: {processingFile}
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={selectedFiles.length === 0 || loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>🔍 Analyzing...</span>
                  </div>
                ) : (
                  <span className="flex items-center justify-center space-x-2">
                    <span>🚀</span>
                    <span>
                      Analyze{" "}
                      {uploadMode === "batch"
                        ? `${selectedFiles.length} Images`
                        : "Image"}
                    </span>
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Results Section */}
        {predictions.length > 0 && (
          <div className="space-y-6">
            {predictions.map((result, index) => (
              <div
                key={result.id}
                className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-100 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4">
                  <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                    <span>🎯</span>
                    <span>
                      Result {index + 1}: {result.file.name}
                    </span>
                  </h2>
                </div>

                {result.status === "error" ? (
                  <div className="p-8">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                      <div className="text-4xl mb-4">❌</div>
                      <h3 className="text-lg font-semibold text-red-800 mb-2">
                        Analysis Failed
                      </h3>
                      <p className="text-red-600">
                        Unable to process this image. Please try again.
                      </p>
                    </div>
                  </div>
                ) : (
                  result.prediction && (
                    <div className="p-8">
                      <div className="grid md:grid-cols-2 gap-8">
                        {/* Image */}
                        {/* Image */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                            <span>📸</span>
                            <span>Analyzed Image</span>
                          </h3>
                          <div className="relative rounded-xl overflow-hidden shadow-lg bg-gray-100 flex items-center justify-center min-h-64">
                            <img
                              src={result.preview}
                              alt="Analyzed crop"
                              className="max-w-full max-h-96 object-contain rounded-xl"
                            />
                          </div>

                          {/* Grad-CAM Heatmap */}
                          {result.prediction.gradcam_image && (
                            <>
                              <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2 mt-4">
                                <span>🔥</span>
                                <span>Grad-CAM Heatmap</span>
                              </h3>
                              <div className="relative rounded-xl overflow-hidden shadow-lg bg-gray-100 flex items-center justify-center h-64">
                                <img
                                  src={result.prediction.gradcam_image}
                                  alt="Grad-CAM visualization"
                                  className="w-full h-full object-contain rounded-xl"
                                />
                              </div>
                              <p className="text-xs text-gray-600 text-center">
                                Red areas indicate regions the model focused on
                                for diagnosis
                              </p>
                            </>
                          )}
                        </div>

                        {/* Results */}
                        <div className="space-y-6">
                          {/* Main Prediction with Severity */}
                          <div
                            className={`${getHealthStatusColor(
                              result.prediction.top1.class
                            )} rounded-2xl p-6 border-2`}
                          >
                            <div className="flex items-start space-x-4">
                              <div className="text-4xl">
                                {getDiseaseEmoji(result.prediction.top1.class)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-4">
                                  <div>
                                    <h3 className="text-xl font-bold mb-2">
                                      {result.prediction.top1.class}
                                    </h3>
                                    <div className="flex items-center space-x-3 mb-2">
                                      <span className="px-3 py-1 bg-white/80 text-gray-700 rounded-full text-sm font-medium">
                                        {(
                                          result.prediction.top1.confidence *
                                          100
                                        ).toFixed(1)}
                                        % confidence
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Severity Rating */}
                                <div className="mb-4">
                                  {(() => {
                                    const severity = getSeverityRating(
                                      result.prediction.top1.class,
                                      result.prediction.top1.confidence
                                    );
                                    return (
                                      <div className="flex items-center space-x-3">
                                        <span className="text-sm font-medium text-gray-700">
                                          Severity:
                                        </span>
                                        <div
                                          className={`${severity.color} px-3 py-1 rounded-full flex items-center space-x-2`}
                                        >
                                          <span>{severity.icon}</span>
                                          <span className="font-semibold text-sm">
                                            {severity.level}
                                          </span>
                                        </div>
                                        <span className="text-sm text-gray-600">
                                          ({severity.description})
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Details */}
                                <div className="space-y-3 text-sm">
                                  <div className="bg-white/50 rounded-lg p-3">
                                    <h4 className="font-semibold text-gray-800 mb-1 flex items-center space-x-2">
                                      <span>🔍</span>
                                      <span>Diagnosis</span>
                                    </h4>
                                    <p className="text-gray-700 leading-relaxed">
                                      {result.prediction.top1.reason}
                                    </p>
                                  </div>

                                  <div className="bg-white/50 rounded-lg p-3">
                                    <h4 className="font-semibold text-gray-800 mb-1 flex items-center space-x-2">
                                      <span>💡</span>
                                      <span>Treatment</span>
                                    </h4>
                                    <p className="text-gray-700 leading-relaxed">
                                      {result.prediction.top1.tips}
                                    </p>
                                  </div>

                                  <div className="bg-white/50 rounded-lg p-3">
                                    <h4 className="font-semibold text-gray-800 mb-1 flex items-center space-x-2">
                                      <span>🌱</span>
                                      <span>Fertilizer</span>
                                    </h4>
                                    <p className="text-gray-700 leading-relaxed">
                                      {result.prediction.top1.fertilizer}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Save Button */}
                          {token && (
                            <button
                              onClick={() => savePrediction(result)}
                              disabled={
                                savingStatus[result.id] === "saving" ||
                                savingStatus[result.id] === "saved"
                              }
                              className={`w-full px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                                savingStatus[result.id] === "saved"
                                  ? "bg-green-600 text-white"
                                  : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                              }`}
                            >
                              {getSaveButtonContent(result.id)}
                            </button>
                          )}

                          {/* Alternative Predictions */}
                          <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border-2 border-gray-200 shadow-sm">
                            <h4 className="font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                              <span className="text-lg">📊</span>
                              <span>Alternative Possibilities</span>
                            </h4>
                            <div className="space-y-3">
                              <div className="bg-white/80 rounded-lg p-3 border border-gray-100 flex items-center justify-between hover:shadow-md transition-all duration-200">
                                <div className="flex items-center space-x-3">
                                  <span className="text-xl">
                                    {getDiseaseEmoji(
                                      result.prediction.top2.class
                                    )}
                                  </span>
                                  <div>
                                    <span className="text-sm font-medium text-gray-800">
                                      {result.prediction.top2.class}
                                    </span>
                                    <div className="text-xs text-gray-500">
                                      Second most likely
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                                    {(
                                      result.prediction.top2.confidence * 100
                                    ).toFixed(1)}
                                    %
                                  </span>
                                </div>
                              </div>
                              <div className="bg-white/80 rounded-lg p-3 border border-gray-100 flex items-center justify-between hover:shadow-md transition-all duration-200">
                                <div className="flex items-center space-x-3">
                                  <span className="text-xl">
                                    {getDiseaseEmoji(
                                      result.prediction.top3.class
                                    )}
                                  </span>
                                  <div>
                                    <span className="text-sm font-medium text-gray-800">
                                      {result.prediction.top3.class}
                                    </span>
                                    <div className="text-xs text-gray-500">
                                      Third most likely
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                                    {(
                                      result.prediction.top3.confidence * 100
                                    ).toFixed(1)}
                                    %
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            ))}

            {/* Summary for batch results */}
            {uploadMode === "batch" && predictions.length > 1 && (
              <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4">
                  <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                    <span>📈</span>
                    <span>Batch Analysis Summary</span>
                  </h2>
                </div>
                <div className="p-8">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {
                          predictions.filter(
                            (p) =>
                              p.prediction &&
                              p.prediction.top1.class
                                .toLowerCase()
                                .includes("healthy")
                          ).length
                        }
                      </div>
                      <div className="text-sm text-gray-600">Healthy Crops</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">
                        {
                          predictions.filter(
                            (p) =>
                              p.prediction &&
                              !p.prediction.top1.class
                                .toLowerCase()
                                .includes("healthy")
                          ).length
                        }
                      </div>
                      <div className="text-sm text-gray-600">
                        Diseased Crops
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-600">
                        {predictions.filter((p) => p.status === "error").length}
                      </div>
                      <div className="text-sm text-gray-600">
                        Failed Analyses
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={() => {
                  setPredictions([]);
                  setSelectedFiles([]);
                }}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                🔄 Analyze New Images
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
