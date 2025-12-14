import React, { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // We will keep the error state for inline display
  const [error, setError] = useState(""); 
  const [isSubmitting, setIsSubmitting] = useState(false); // NEW: State to prevent double-submitting

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    setIsSubmitting(true); // Disable button during submission
    
    try {
      const res = await api.post("/auth/login", { username, password });
      
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/wigs");
    } catch (err) {
      // --- ENHANCED: Specific Error Handling ---
      console.error("Login failed:", err);
      
      let userMessage = "Login failed. Please check your network connection and try again.";

      if (err.response) {
        if (err.response.status === 401) {
          // Typically used for invalid credentials
          userMessage = "Invalid username or password. Please try again.";
        } else if (err.response.status === 403) {
          // Could be used if the user is suspended/inactive
          userMessage = "Your account is inactive or requires activation.";
        } else if (err.response.data && err.response.data.message) {
          // Use a specific message sent by the backend if available
          userMessage = err.response.data.message;
        } else {
          // Fallback for other API status codes
          userMessage = `Authentication error: ${err.response.statusText} (${err.response.status}).`;
        }
      }
      
      setError(userMessage);
    } finally {
      setIsSubmitting(false); // Re-enable button
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-md w-96">
        <h2 className="text-2xl font-semibold text-center mb-6">Login</h2>
        
        {/* Updated error display for better visibility */}
        {error && (
          <p className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-4">
            {error}
          </p>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={isSubmitting}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;