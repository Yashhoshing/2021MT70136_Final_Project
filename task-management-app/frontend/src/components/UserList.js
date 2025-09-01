import React, { useEffect, useState } from "react";
import axios from "axios";

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:8001/users", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(res.data);
      } catch (err) {
        setError("Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) return <div>Loading users...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="user-list-bg">
      <style>{`
        .user-list-bg { min-height: 100vh; background: linear-gradient(135deg, #e8eaf6 0%, #f1f8ff 100%); display: flex; align-items: center; justify-content: center; }
        .user-list-card { background: #fff; padding: 2.5rem 2rem; border-radius: 16px; box-shadow: 0 8px 32px rgba(76,68,182,.12); min-width: 340px; }
        .user-list-title { font-size: 2rem; font-weight: 700; color: #2563eb; margin-bottom: 1.5rem; text-align: center; }
        .user-table { width: 100%; border-collapse: collapse; }
        .user-table th, .user-table td { padding: 10px 16px; border-bottom: 1px solid #e0e7ef; text-align: left; }
        .user-table th { background: #f1f8ff; color: #2563eb; font-weight: 600; }
      `}</style>
      <div className="user-list-card">
        <div className="user-list-title">User List</div>
        <table className="user-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserList;
