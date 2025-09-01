import React, { useState } from "react";
import axios from "axios";

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("User");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
  await axios.post("http://localhost:8000/register", { username, password, role });
      alert("Registration successful! Please login.");
      window.location.href = "/login";
    } catch {
      alert("Registration failed, user may already exist.");
    }
  };

  return (
    <div className="register-bg">
      <style>{`
        .register-bg { min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center;}
        .register-card { background: #fff; padding: 2.5rem 2rem; border-radius: 16px; box-shadow: 0 8px 32px rgba(76,68,182,.2); min-width: 340px; }
        .register-title { font-size: 2rem; font-weight: 700; color: #5a189a; margin-bottom: 1.5rem; text-align: center;}
        .register-input { padding: 12px 16px; margin-bottom: 1.1rem; border: none; border-radius: 8px; background: #f3f0ff; font-size: 1rem;}
        .register-btn { background: linear-gradient(90deg, #a18cd1 0%, #fbc2eb 100%); color: #fff; padding: 12px 0; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: 600; cursor: pointer;}
        .register-btn:hover { transform: scale(1.04);}
      `}</style>
      <form className="register-card" onSubmit={handleSubmit}>
        <div className="register-title">Register</div>
        <input className="register-input" type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
        <input className="register-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <select className="register-input" value={role} onChange={e => setRole(e.target.value)} required>
          <option value="User">User</option>
          <option value="Admin">Admin</option>
          <option value="Guest">Guest</option>
        </select>
        <button className="register-btn" type="submit">Register</button>
      </form>
    </div>
  );
};

export default Register;
