import React, { useState } from "react";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    
    try {
      const res = await fetch("http://127.0.0.1:5000/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage("Account created! Please login.");
        setIsSuccess(true);
      } else {
        setMessage(data.error || "Signup failed. Please try again.");
        setIsSuccess(false);
      }
    } catch (err) {
      setMessage("Network error. Please check your connection.");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: "🌾",
      title: "Multi-Crop Support",
      description: "Analyze Rice, Corn, and Tomato crops"
    },
    {
      icon: "🔬",
      title: "AI-Powered Detection",
      description: "Advanced machine learning algorithms"
    },
    {
      icon: "📊",
      title: "Confidence Scores",
      description: "Detailed confidence levels for predictions"
    },
    {
      icon: "💡",
      title: "Treatment Guidance",
      description: "Actionable treatment recommendations"
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4">
      <div className="flex bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-6xl max-h-[95vh]">
        
        {/* Left side - Information Panel */}
        <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white flex-col justify-between p-8 relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full -ml-48 -mb-48"></div>
          
          <div className="relative z-10 overflow-y-auto">
            {/* Logo and Title */}
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl">
                  <span className="text-3xl">🌿</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold">AgriScan Pro</h1>
                  <p className="text-emerald-100 text-xs font-medium">Smart Crop Disease Detection</p>
                </div>
              </div>
              <p className="text-sm text-emerald-50 leading-relaxed">
                Join thousands of farmers using AI technology to protect their crops. 
                Create your account today and start detecting diseases with professional accuracy.
              </p>
            </div>

            {/* Features Grid */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-3">What You'll Get</h3>
              <div className="grid grid-cols-1 gap-3">
                {features.map((feature, index) => (
                  <div 
                    key={index}
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-3 hover:bg-white/20 transition-all duration-300"
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{feature.icon}</span>
                      <div>
                        <h4 className="font-semibold text-base mb-1">{feature.title}</h4>
                        <p className="text-emerald-100 text-xs">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Signup Form */}
        <div className="w-full lg:w-1/2 p-8 flex flex-col justify-center overflow-y-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">🌿</span>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent mb-2">
              Create Account
            </h2>
            <p className="text-gray-600 font-medium text-sm">Join AgriScan Pro and start protecting your crops</p>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-4 ${isSuccess ? 'bg-emerald-50 border-l-4 border-emerald-500' : 'bg-red-50 border-l-4 border-red-500'} p-3 rounded-lg`}>
              <div className="flex items-center space-x-2">
                <span className={`${isSuccess ? 'text-emerald-500' : 'text-red-500'} text-lg`}>
                  {isSuccess ? '✅' : '⚠️'}
                </span>
                <p className={`${isSuccess ? 'text-emerald-700' : 'text-red-700'} font-medium text-sm`}>{message}</p>
              </div>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
                  👤
                </span>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none font-medium text-sm"
                  required
                />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
                  📧
                </span>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none font-medium text-sm"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
                  🔒
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none font-medium text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3.5 rounded-xl font-bold text-base transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating Account...</span>
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Already have an account?{" "}
              <a 
                href="/login" 
                className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors"
              >
                Sign In
              </a>
            </p>
          </div>

          {/* Divider */}
          <div className="mt-6 flex items-center">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-xs text-gray-500 font-medium">Start your journey today</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;