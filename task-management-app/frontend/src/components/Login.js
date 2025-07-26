import React, { useState } from "react";
import axios from "axios";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://localhost:8000/login",
        new URLSearchParams({ username, password }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      localStorage.setItem("token", res.data.access_token);
      alert("Login successful!");
      window.location.href = "/tasks";
    } catch {
      alert("Invalid username or password.");
    }
  };

  return (
    <div className="login-bg">
      <style>{`
        .login-bg { min-height: 100vh; background: linear-gradient(135deg, #6190e8 0%, #a7bfe8 100%); display: flex; align-items: center; justify-content: center;}
        .login-card { background: #fff; padding: 2.5rem 2rem; border-radius: 16px; box-shadow: 0 8px 32px rgba(76,68,182,.2); min-width: 340px;}
        .login-title { font-size: 2rem; font-weight: 700; color: #2563eb; margin-bottom: 1.5rem; text-align: center;}
        .login-input { padding: 12px 16px; margin-bottom: 1.1rem; border: none; border-radius: 8px; background: #f1f8ff; font-size: 1rem;}
        .login-btn { background: linear-gradient(90deg, #6190e8 0%, #a7bfe8 100%); color: #fff; padding: 12px 0; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: 600; cursor: pointer;}
        .login-btn:hover { transform: scale(1.04);}
      `}</style>
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-title">Login</div>
        <input className="login-input" type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
        <input className="login-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button className="login-btn" type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
