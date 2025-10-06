import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const History = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ total: 0, healthy: 0, diseased: 0 });
  const [selected, setSelected] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("profile");

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    // Fetch user profile
    axios
      .get("http://localhost:5000/auth/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data.success) {
          setUser(res.data.user);
        } else {
          setError(res.data.error || "Failed to fetch user data");
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Failed to fetch user data");
      })
      .finally(() => setLoading(false));

    // Fetch history and stats
    fetchHistory();
    fetchStats();
  }, [navigate, token]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:5000/history/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setHistory(data.history);
      } else {
        console.error(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/history/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const deleteItem = async (item, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete prediction for "${item.disease}"?`)) return;

    try {
      // Use prediction_id which is the MongoDB _id
      const res = await fetch(
        `http://127.0.0.1:5000/history/delete/${item.prediction_id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        // Remove from local state using prediction_id
        setHistory((prev) =>
          prev.filter((h) => h.prediction_id !== item.prediction_id)
        );
        fetchStats();
        setSelected(null); // Close modal if open
        alert("Deleted successfully");
      } else {
        const data = await res.json();
        alert("Delete failed: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting item");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
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

  const getHealthStatusColor = (className) => {
    if (className.toLowerCase().includes("healthy")) {
      return "bg-green-50 border-green-200";
    } else {
      return "bg-red-50 border-red-200";
    }
  };

  const getSeverityLevel = (className, confidence) => {
    const isHealthy = className.toLowerCase().includes("healthy");

    if (isHealthy) {
      return { level: "Low", color: "text-green-600 bg-green-100", icon: "🟢" };
    }

    if (confidence >= 0.8) {
      return { level: "High", color: "text-red-600 bg-red-100", icon: "🔴" };
    } else if (confidence >= 0.6) {
      return {
        level: "Medium",
        color: "text-yellow-600 bg-yellow-100",
        icon: "🟡",
      };
    } else {
      return { level: "Low", color: "text-blue-600 bg-blue-100", icon: "🔵" };
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredHistory = history.filter((item) => {
    if (filter === "all") return true;
    if (filter === "healthy")
      return item.disease.toLowerCase().includes("healthy");
    if (filter === "diseased")
      return !item.disease.toLowerCase().includes("healthy");
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <p className="text-red-600 mb-4">{error || "No user logged in."}</p>
        <button
          onClick={() => navigate("/login")}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              👤
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
                My Account
              </h1>
              <p className="text-sm text-gray-600 font-medium">
                Manage profile and view history
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-lg"
          >
            🔒 Logout
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-100 p-2 mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === "profile"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              📝 Profile
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === "history"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              📚 History ({stats.total})
            </button>
          </div>
        </div>

        {/* Profile Tab Content */}
        {activeTab === "profile" && (
          <div className="max-w-3xl mx-auto">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 font-medium mb-1">
                      Total Predictions
                    </p>
                    <p className="text-4xl font-bold text-gray-800">
                      {stats.total}
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center text-white text-3xl shadow-lg">
                    📊
                  </div>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 font-medium mb-1">
                      Healthy Crops
                    </p>
                    <p className="text-4xl font-bold text-green-600">
                      {stats.healthy}
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-white text-3xl shadow-lg">
                    🌱
                  </div>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 font-medium mb-1">
                      Diseased Crops
                    </p>
                    <p className="text-4xl font-bold text-red-600">
                      {stats.diseased}
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center text-white text-3xl shadow-lg">
                    🦠
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Card */}
            <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Account Information
              </h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                  <span className="text-2xl">📝</span>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">
                      Username
                    </p>
                    <p className="text-lg text-gray-800 font-semibold">
                      {user.username}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                  <span className="text-2xl">📧</span>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Email</p>
                    <p className="text-lg text-gray-800 font-semibold">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab Content */}
        {activeTab === "history" && (
          <div>
            {/* Filter Buttons */}
            <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-100 p-6 mb-8">
              <div className="flex items-center justify-center space-x-4">
                <span className="text-gray-700 font-medium">Filter:</span>
                <div className="flex bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setFilter("all")}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      filter === "all"
                        ? "bg-emerald-600 text-white shadow-md"
                        : "text-gray-600 hover:text-emerald-600"
                    }`}
                  >
                    📋 All ({history.length})
                  </button>
                  <button
                    onClick={() => setFilter("healthy")}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      filter === "healthy"
                        ? "bg-green-600 text-white shadow-md"
                        : "text-gray-600 hover:text-green-600"
                    }`}
                  >
                    🌱 Healthy ({stats.healthy})
                  </button>
                  <button
                    onClick={() => setFilter("diseased")}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      filter === "diseased"
                        ? "bg-red-600 text-white shadow-md"
                        : "text-gray-600 hover:text-red-600"
                    }`}
                  >
                    🦠 Diseased ({stats.diseased})
                  </button>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {historyLoading && (
              <div className="flex justify-center items-center py-20">
                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
              </div>
            )}

            {/* Empty State */}
            {!historyLoading && filteredHistory.length === 0 && (
              <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-100 p-12 text-center">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  No History Available
                </h3>
                <p className="text-gray-600 mb-6">
                  {filter === "all"
                    ? "Start analyzing crops to build your history"
                    : `No ${filter} predictions found`}
                </p>
                <a
                  href="/dashboard"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg"
                >
                  🚀 Go to Dashboard
                </a>
              </div>
            )}

            {/* History Grid */}
            {!historyLoading && filteredHistory.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHistory.map((item, index) => (
                  <div
                    key={index}
                    className={`bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl border-2 overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${getHealthStatusColor(
                      item.disease
                    )}`}
                    onClick={() => setSelected(item)}
                  >
                    <div className="relative h-48">
                      {item.image_base64 ? (
                        <img
                          src={item.image_base64}
                          alt="Crop"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                          <span className="text-6xl">
                            {getDiseaseEmoji(item.disease)}
                          </span>
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <button
                          onClick={(e) => deleteItem(item, e)}
                          className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 shadow-lg"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                      {(() => {
                        const severity = getSeverityLevel(
                          item.disease,
                          item.confidence
                        );
                        return (
                          <div className="absolute bottom-3 left-3">
                            <div
                              className={`${severity.color} px-3 py-1 rounded-full flex items-center space-x-2 shadow-lg`}
                            >
                              <span>{severity.icon}</span>
                              <span className="font-semibold text-sm">
                                {severity.level}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">
                            {getDiseaseEmoji(item.disease)}
                          </span>
                          <div>
                            <h3 className="font-bold text-gray-800 text-lg leading-tight">
                              {item.disease}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(item.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="bg-white/80 px-3 py-1 rounded-full">
                          <span className="text-sm font-semibold text-gray-700">
                            {(item.confidence * 100).toFixed(1)}% confident
                          </span>
                        </div>
                        <button className="text-emerald-600 font-medium text-sm hover:text-emerald-700">
                          View Details →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6 relative">
              <button
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl transition-all"
                onClick={() => setSelected(null)}
              >
                ✕
              </button>
              <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                <span>{getDiseaseEmoji(selected.disease)}</span>
                <span>Detailed Analysis</span>
              </h2>
              <p className="text-emerald-100 mt-2">
                {formatDate(selected.timestamp)}
              </p>
            </div>

            {/* Modal Content */}
            <div
              className="p-8 overflow-y-scroll"
              style={{ maxHeight: "calc(90vh - 96px)" }}
            >
              <div className="grid md:grid-cols-2 gap-8">
                {/* Image Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                    <span>📸</span>
                    <span>Image</span>
                  </h3>
                  <div className="rounded-xl overflow-hidden shadow-lg">
                    {selected.image_base64 ? (
                      <img
                        src={selected.image_base64}
                        alt="Crop"
                        className="w-full h-auto object-contain bg-gray-100"
                      />
                    ) : (
                      <div className="w-full h-64 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <span className="text-8xl">
                          {getDiseaseEmoji(selected.disease)}
                        </span>
                      </div>
                    )}
                  </div>
                  {selected.filename && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-600">
                        <strong>Filename:</strong> {selected.filename}
                      </p>
                    </div>
                  )}
                </div>

                {/* Details Section */}
                <div className="space-y-6">
                  {/* Main Diagnosis */}
                  <div
                    className={`${getHealthStatusColor(
                      selected.disease
                    )} rounded-2xl p-6 border-2`}
                  >
                    <h3 className="text-xl font-bold text-gray-800 mb-3">
                      {selected.disease}
                    </h3>
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="px-3 py-1 bg-white/80 text-gray-700 rounded-full text-sm font-medium">
                        {(selected.confidence * 100).toFixed(1)}% confidence
                      </span>
                      {(() => {
                        const severity = getSeverityLevel(
                          selected.disease,
                          selected.confidence
                        );
                        return (
                          <div
                            className={`${severity.color} px-3 py-1 rounded-full flex items-center space-x-2`}
                          >
                            <span>{severity.icon}</span>
                            <span className="font-semibold text-sm">
                              {severity.level} Severity
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Diagnosis Details */}
                  <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center space-x-2">
                      <span>🔍</span>
                      <span>Diagnosis</span>
                    </h4>
                    <p className="text-gray-700 leading-relaxed">
                      {selected.reason}
                    </p>
                  </div>

                  {/* Treatment */}
                  <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center space-x-2">
                      <span>💡</span>
                      <span>Treatment Recommendations</span>
                    </h4>
                    <p className="text-gray-700 leading-relaxed">
                      {selected.tips}
                    </p>
                  </div>

                  {/* Fertilizer */}
                  <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-200">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center space-x-2">
                      <span>🌱</span>
                      <span>Fertilizer Recommendations</span>
                    </h4>
                    <p className="text-gray-700 leading-relaxed">
                      {selected.fertilizer}
                    </p>
                  </div>

                  {/* Alternative Predictions */}
                  {selected.top2_class && (
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                        <span>📊</span>
                        <span>Alternative Possibilities</span>
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-white rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <span>{getDiseaseEmoji(selected.top2_class)}</span>
                            <span className="text-sm font-medium text-gray-800">
                              {selected.top2_class}
                            </span>
                          </div>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                            {(selected.top2_confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        {selected.top3_class && (
                          <div className="flex items-center justify-between bg-white rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <span>
                                {getDiseaseEmoji(selected.top3_class)}
                              </span>
                              <span className="text-sm font-medium text-gray-800">
                                {selected.top3_class}
                              </span>
                            </div>
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                              {(selected.top3_confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <button
                      onClick={(e) => deleteItem(selected, e)}
                      className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all shadow-lg"
                    >
                      🗑️ Delete
                    </button>
                    <button
                      onClick={() => setSelected(null)}
                      className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-all shadow-lg"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
