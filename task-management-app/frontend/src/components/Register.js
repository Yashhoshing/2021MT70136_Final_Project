import React, { useState, useEffect } from "react";
import axios from "axios";
import { Box, Card, CardContent, Typography, TextField, Button, Snackbar, Alert, MenuItem } from "@mui/material";

const Register = ({ isAdminRegister }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("User");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    const token = localStorage.getItem("token");
    let isAdminUser = false;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        isAdminUser = payload.role === "Admin";
      } catch {
        isAdminUser = false;
      }
    }
    axios.get("http://localhost:8000/me")
      .then(() => {
        setIsAdmin(isAdminUser);
      })
      .catch(() => {
        axios.get("http://localhost:8000/users/count")
          .then(res => {
            if (res.data.count === 0) {
              setIsAdmin(true);
            } else {
              setIsAdmin(isAdminUser);
            }
          })
          .catch(() => setIsAdmin(isAdminUser));
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const countRes = await axios.get("http://localhost:8000/users/count");
      console.log("User count:", countRes.data.count);
      if (countRes.data.count === 0) {
        await axios.post("http://localhost:8000/register", { username, password, role });
      } else {
        if (isAdminRegister) {
          await axios.post("http://localhost:8000/admin/register", { username, password, role }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else {
          await axios.post("http://localhost:8000/register", { username, password, role });
        }
      }
      setSnackbar({ open: true, message: "User registered successfully!", severity: "success" });
      setUsername("");
      setPassword("");
      setRole("User");
      setTimeout(() => {
        const regToken = localStorage.getItem("token");
        if (regToken) {
          const payload = JSON.parse(atob(regToken.split(".")[1]));
          window.location.href = "/tasks";
        }
      }, 1200);
    } catch {
      setSnackbar({ open: true, message: "Registration failed, user may already exist or you are not authorized.", severity: "error" });
    }
    setLoading(false);
  };

  if (!isAdmin) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f3f6fd" }}>
        <Card sx={{ p: 4, borderRadius: 4, boxShadow: 3, minWidth: 340 }}>
          <CardContent>
            <Typography variant="h6" color="primary" align="center">Only Admins can register new users.</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f3f6fd" }}>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>{snackbar.message}</Alert>
      </Snackbar>
      <Card sx={{ p: 4, borderRadius: 4, boxShadow: 3, minWidth: 340 }}>
        <CardContent>
          <Typography variant="h5" color="primary" align="center" fontWeight={700} mb={2}>Register New User</Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <TextField
              select
              label="Role"
              value={role}
              onChange={e => setRole(e.target.value)}
              required
            >
              <MenuItem value="User">User</MenuItem>
              <MenuItem value="Admin">Admin</MenuItem>
              <MenuItem value="Guest">Guest</MenuItem>
            </TextField>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              sx={{ borderRadius: 2, fontWeight: 600, px: 3, boxShadow: 1 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : "Register New User"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Register;
