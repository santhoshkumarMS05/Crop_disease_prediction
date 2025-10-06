import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const Header = () => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Don't show header on login/register pages
  const publicPaths = ["/", "/login", "/register", "/signup"];
  const shouldShowHeader = !publicPaths.includes(location.pathname);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!shouldShowHeader) {
    return null;
  }

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: "🏠" },
    { name: "History & Profile", path: "/history", icon: "📚" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 shadow-2xl"
          : "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 shadow-xl"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center space-x-3 group">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-all duration-300">
              <span className="text-2xl">🌿</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AgriScan Pro</h1>
              <p className="text-xs text-white font-medium">
                Smart Crop Analysis
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 ${
                  location.pathname === item.path
                    ? "bg-white text-emerald-600 shadow-lg"
                    : "text-white hover:bg-white/20 hover:shadow-md"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-white hover:bg-gray-100 shadow-md transition-all"
          >
            {mobileMenuOpen ? (
              <svg
                className="w-6 h-6 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-2 border-t border-white/30 pt-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-5 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-3 ${
                  location.pathname === item.path
                    ? "bg-white text-emerald-600 shadow-lg"
                    : "bg-white/20 text-white hover:bg-white/30 hover:shadow-md"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
