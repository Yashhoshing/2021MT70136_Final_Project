import React, { useEffect, useState } from "react";
import axios from "axios";
import TaskCreate from "./TaskCreate";
import AdminDashboard from "./AdminDashboard";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  CircularProgress,
  Snackbar,
  Alert,
  useMediaQuery,
  Tabs,
  Tab,
  Autocomplete,
  TextField,
  Divider
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";

const ProgressBar = ({ progress, status }) => {
  if (status === "Done") progress = 100;
  let bgColor = "#ef4444";
  if (progress > 70) bgColor = "#22c55e";
  else if (progress > 30) bgColor = "#facc15";

  return (
    <Box sx={{ height: 16, width: "100%", bgcolor: "#e0e7ef", borderRadius: 2, mt: 1, overflow: "hidden" }}>
      <Box
        sx={{
          height: "100%",
          width: `${progress}%`,
          bgcolor: bgColor,
          transition: "width 0.3s",
          textAlign: "center",
          color: "#222",
          fontWeight: 600,
          fontSize: 12,
          lineHeight: "16px",
        }}
      >
        {progress}%
      </Box>
    </Box>
  );
};



const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [selectedTaskIdx, setSelectedTaskIdx] = useState(0);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);

  const token = localStorage.getItem("token");
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserTasks, setShowUserTasks] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true); // Default to dashboard
  const [showDeleteUser, setShowDeleteUser] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Check if logged-in user is admin
  useEffect(() => {
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const isAdminVal = payload.role === "Admin";
      setIsAdmin(isAdminVal);
      setShowDashboard(isAdminVal); // Show dashboard by default for admin
      console.log("[DEBUG] isAdmin:", isAdminVal, "token:", token, "payload:", payload);
    } catch (e) {
      setIsAdmin(false);
      setShowDashboard(false);
      console.log("[DEBUG] Failed to parse token for admin check", e, token);
    }
  }, [token]);

  // Fetch users for admin (exclude admin)
  useEffect(() => {
    if (isAdmin && token) {
      axios.get("http://localhost:8001/users", { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setUsers(res.data.filter(u => u.username !== payload.sub));
        });
    }
  }, [isAdmin, token]);

  // Fetch tasks
  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    let url = "http://localhost:8001/tasks";
    let params = {};
    if (isAdmin && selectedUser) {
      params.user = selectedUser.username;
    }
    axios
      .get(url, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      })
      .then((res) => {
        setTasks(res.data);
        // Determine the correct selected index
        let newIdx = 0;
        setSelectedTaskIdx(idx => {
          if (res.data.length === 0) return 0;
          if (idx >= res.data.length) return res.data.length - 1;
          return idx;
        });
        if (res.data.length === 0) {
          setComments([]);
          setActivity([]);
        } else {
          // Use the same logic as setSelectedTaskIdx to get the actual selected index
          newIdx = selectedTaskIdx;
          if (newIdx >= res.data.length) newIdx = res.data.length - 1;
          if (newIdx < 0) newIdx = 0;
          const task = res.data[newIdx];
          axios.get(`http://localhost:8001/tasks/${task.id}/comments`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => setComments(r.data))
            .catch(() => setComments([]));
          axios.get(`http://localhost:8001/tasks/${task.id}/activity`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => setActivity(r.data))
            .catch(() => setActivity([]));
        }
      })
      .catch(() => {
        setTasks([]);
        setComments([]);
        setActivity([]);
      })
      .finally(() => setLoading(false));
  }, [token, isAdmin, selectedUser]);

  // Fetch comments and activity for the selected task
  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }
    if (!tasks || tasks.length === 0) {
      setComments([]);
      setActivity([]);
      return;
    }
    const task = tasks[selectedTaskIdx];
    if (!task || !task.id) {
      setComments([]);
      setActivity([]);
      return;
    }
    axios.get(`http://localhost:8001/tasks/${task.id}/comments`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setComments(r.data))
      .catch(() => setComments([]));
    axios.get(`http://localhost:8001/tasks/${task.id}/activity`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setActivity(r.data))
      .catch(() => setActivity([]));
  }, [selectedTaskIdx, tasks, token]);

  // Tab switching handler
  const handleTabClick = (event, idx) => {
    setSelectedTaskIdx(idx);
    setSelectedTask(null);
    setShowForm(false);
    // Fetch comments and activity for the selected task
    const task = tasks[idx];
    if (task && task.id) {
      axios.get(`http://localhost:8001/tasks/${task.id}/comments`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setComments(res.data))
        .catch(() => setComments([]));
      axios.get(`http://localhost:8001/tasks/${task.id}/activity`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setActivity(res.data))
        .catch(() => setActivity([]));
    } else {
      setComments([]);
      setActivity([]);
    }
  };

  // Show form for editing selected task
  const handleEditClick = () => {
    setSelectedTask(tasks[selectedTaskIdx]);
    setShowForm(true);
  };

  const handleAddClick = (flag) => {
    setSelectedTask(null);
    setShowForm(true);
    setIsAddMode(flag);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f3f6fd", p: isMobile ? 1 : 4 }}>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>{snackbar.message}</Alert>
      </Snackbar>
      <Box
        sx={{
          maxWidth: 1000,
          minHeight: 700,
          mx: "auto",
          bgcolor: "#fff",
          borderRadius: 4,
          boxShadow: 6,
          p: isMobile ? 2 : 6,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2 }}>
          <Button
            variant="contained"
            color="error"
            sx={{ borderRadius: 2, fontWeight: 600, px: 3, boxShadow: 1, ml: 2 }}
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/login";
            }}
          >Logout</Button>
        </Box>
        {/* Second row: Task List toggle left, user actions right */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          {/* Left: Task List/Dashboard toggle */}
          <Box>
            {isAdmin && (
              <Button
                variant="contained"
                color="primary"
                sx={{ borderRadius: 2, fontWeight: 600, minWidth: 120, boxShadow: 1 }}
                onClick={() => setShowDashboard(d => !d)}
              >{showDashboard ? "Task List" : "Go To Dashboard"}</Button>
            )}
          </Box>
          {/* Right: User dropdown, Add Task, Add User, Delete User */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {isAdmin && (
              <Autocomplete
                options={users}
                getOptionLabel={u => u.username}
                value={selectedUser}
                onChange={(_, val) => {
                  setSelectedUser(val);
                  setShowForm(false);
                  setSelectedTaskIdx(0);
                }}
                sx={{ minWidth: 220, bgcolor: "#f3f6fd", borderRadius: 2 }}
                renderInput={params => <TextField {...params} label="Select user" variant="outlined" size="small" />}
                isOptionEqualToValue={(option, value) => option?.username === value?.username}
                disableClearable={false}
              />
            )}
            {isAdmin && !showDashboard && (
              <Button
                variant="contained"
                color="success"
                sx={{ borderRadius: 2, fontWeight: 600, minWidth: 120, boxShadow: 1 }}
                onClick={() => handleAddClick(true)}
                disabled={!selectedUser}
              >Add Task</Button>
            )}
            {isAdmin && (
              <Button
                variant="contained"
                color="error"
                sx={{ borderRadius: 2, fontWeight: 600, minWidth: 120, boxShadow: 1 }}
                disabled={!selectedUser || deleteUserLoading}
                onClick={async () => {
                  if (!selectedUser) return setSnackbar({ open: true, message: "Select a user to delete.", severity: "warning" });
                  if (!window.confirm(`Are you sure you want to delete user '${selectedUser.username}'? This will also delete their tasks.`)) return;
                  setDeleteUserLoading(true);
                  try {
                    await axios.delete(`http://localhost:8001/users/${selectedUser.username}`, { headers: { Authorization: `Bearer ${token}` } });
                    setSnackbar({ open: true, message: "User deleted!", severity: "success" });
                    // Refresh users
                    const res = await axios.get("http://localhost:8001/users", { headers: { Authorization: `Bearer ${token}` } });
                    const payload = JSON.parse(atob(token.split(".")[1]));
                    setUsers(res.data.filter(u => u.username !== payload.sub));
                    setSelectedUser(null);
                  } catch (err) {
                    setSnackbar({ open: true, message: "Failed to delete user: " + (err.response?.data?.detail || err.message), severity: "error" });
                  } finally {
                    setDeleteUserLoading(false);
                  }
                }}
              >
                {deleteUserLoading ? <CircularProgress size={22} color="inherit" /> : "Delete User"}
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="contained"
                color="success"
                sx={{ borderRadius: 2, fontWeight: 600, minWidth: 120, boxShadow: 1 }}
                onClick={() => window.location.href = "/admin/register"}
              >Add User</Button>
            )}
          </Box>
        </Box>

        {/* Admin Dashboard */}
        {isAdmin && showDashboard && (
          <AdminDashboard token={token} selectedUser={selectedUser} />
        )}
        {/* Tabs for each task for selected user (admin) or self (user) */}
        {!showDashboard && !isAddMode && ((isAdmin && selectedUser) || !isAdmin) && (
          <Tabs
            value={selectedTaskIdx}
            onChange={handleTabClick}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 3, bgcolor: "#f3f6fd", borderRadius: 2 }}
          >
            {tasks.map((task, idx) => (
              <Tab
                key={task.id}
                label={task.title}
                sx={{
                  fontWeight: selectedTaskIdx === idx ? 700 : 500,
                  color: selectedTaskIdx === idx ? "primary.dark" : "#555",
                  minWidth: 80,
                  borderRadius: 2,
                  mx: 0.5,
                }}
              />
            ))}
          </Tabs>
        )}
        {/* Show selected task details (for both users and admins) */}
  {tasks.length > 0 && !showForm && !showDashboard && ((isAdmin && selectedUser) || !isAdmin) && (
          <Card sx={{ mb: 3, boxShadow: 3, borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>{tasks[selectedTaskIdx].title}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom><b>Description:</b> {tasks[selectedTaskIdx].description}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom><b>Created At:</b> {new Date(tasks[selectedTaskIdx].created_at).toLocaleString()}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom><b>Status:</b> {tasks[selectedTaskIdx].status}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom><b>Progress:</b></Typography>
              <ProgressBar progress={tasks[selectedTaskIdx].progress} status={tasks[selectedTaskIdx].status} />
              <Button
                variant="contained"
                color="primary"
                sx={{ mt: 2, borderRadius: 2, fontWeight: 600, px: 3, boxShadow: 1 }}
                onClick={handleEditClick}
              >Edit Task</Button>
              {/* Comments and Activity Log */}
              <Card sx={{ mt: 3, mb: 1, boxShadow: 1, borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" color="primary" gutterBottom>Comments</Typography>
                  {comments.length === 0 && <Typography color="text.secondary">No comments yet.</Typography>}
                  {comments.map(c => (
                    <Box key={c.id} sx={{ mb: 1, pl: 1, borderLeft: "3px solid #e0e7ef" }}>
                      <Typography variant="body2"><b>{c.user}</b> <span style={{ color: '#888', fontSize: 12 }}>({new Date(c.timestamp).toLocaleString()})</span></Typography>
                      <Typography variant="body2">{c.comment}</Typography>
                    </Box>
                  ))}
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" color="primary" gutterBottom>Activity Log</Typography>
                  {activity.length === 0 && <Typography color="text.secondary">No activity yet.</Typography>}
                  {activity.map(a => (
                    <Box key={a.id} sx={{ mb: 1, pl: 1, borderLeft: "3px solid #e0e7ef" }}>
                      <Typography variant="body2"><b>{a.user}</b> <span style={{ color: '#888', fontSize: 12 }}>({new Date(a.timestamp).toLocaleString()})</span></Typography>
                      <Typography variant="body2">[{a.action}] {a.detail}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        )}
        {/* Show form for add/edit */}
  {showForm && !showDashboard && (
          <Card sx={{ mb: 3, boxShadow: 3, borderRadius: 3 }}>
            <CardContent>
              <TaskCreate
                onTaskCreated={() => {
                  setShowForm(false);
                  setSelectedTask(null);
                  // Refresh tasks after creation or edit
                  let url = "http://localhost:8001/tasks";
                  let params = {};
                  if (isAdmin && selectedUser) {
                    params.user = selectedUser.username;
                  }
                  axios
                    .get(url, {
                      headers: { Authorization: `Bearer ${token}` },
                      params,
                    })
                    .then((res) => {
                      setTasks(res.data);
                      setSelectedTaskIdx(res.data.length > 0 ? res.data.length - 1 : 0);
                    });
                }}
                onCancel={() => {
                  setShowForm(false);
                  setSelectedTask(null);
                  setIsAddMode(false);
                }}
                initialTask={selectedTask}
                isAdmin={isAdmin}
                users={users}
              />
            </CardContent>
          </Card>
        )}
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mt: 4 }}>
            <CircularProgress color="primary" />
          </Box>
        )}
        {!loading && tasks.length === 0 && (
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 4 }}>
            No tasks found.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default TaskList;
