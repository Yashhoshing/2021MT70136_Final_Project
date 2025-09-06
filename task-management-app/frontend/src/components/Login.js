import React, { useState } from "react";
import axios from "axios";
import { Box, Card, CardContent, Typography, TextField, Button, Snackbar, Alert, CircularProgress } from "@mui/material";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(
        "http://localhost:8000/login",
        new URLSearchParams({ username, password }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      localStorage.setItem("token", res.data.access_token);
      setSnackbar({ open: true, message: "Login successful!", severity: "success" });
      setTimeout(() => {
        const payload = JSON.parse(atob(res.data.access_token.split(".")[1]));
        window.location.href = "/tasks";
      }, 1000);
    } catch (err) {
      if (err.response) {
        setSnackbar({ open: true, message: err.response.data?.detail || "Invalid username or password.", severity: "error" });
      } else if (err.request) {
        setSnackbar({ open: true, message: "No response from server. Check your backend connection.", severity: "error" });
      } else {
        setSnackbar({ open: true, message: "Login failed: " + err.message, severity: "error" });
      }
    }
    setLoading(false);
  };

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
          <Typography variant="h5" color="primary" align="center" fontWeight={700} mb={2}>Login</Typography>
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
            <Button
              type="submit"
              variant="contained"
              color="primary"
              sx={{ borderRadius: 2, fontWeight: 600, px: 3, boxShadow: 1 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : "Login"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
