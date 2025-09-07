import React, { useState, useEffect } from "react";
import axios from "axios";
import { Box, Button, TextField, MenuItem, CircularProgress, Autocomplete, Snackbar, Alert, Card, CardContent, Typography, Divider } from "@mui/material";

const TaskCreate = ({ onTaskCreated, initialTask, isAdmin, users }) => {
  const isEdit = !!initialTask;
  const [newTask, setNewTask] = useState({
    title: initialTask?.title || "",
    description: initialTask?.description || "",
    status: initialTask?.status || "To Do",
    progress: initialTask?.progress ?? 0,
    id: initialTask?.id,
    owner: initialTask?.owner || ""
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (initialTask && initialTask.id) {
      // Fetch comments and activity log for this task
      axios.get(`http://localhost:8001/tasks/${initialTask.id}/comments`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setComments(res.data))
        .catch(() => setComments([]));
      axios.get(`http://localhost:8001/tasks/${initialTask.id}/activity`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setActivity(res.data))
        .catch(() => setActivity([]));
    } else {
      setComments([]);
      setActivity([]);
    }
  }, [initialTask, token]);

  useEffect(() => {
    if (initialTask) {
      setNewTask({
        title: initialTask.title || "",
        description: initialTask.description || "",
        status: initialTask.status || "To Do",
        progress: initialTask.progress ?? 0,
        id: initialTask.id,
        owner: initialTask.owner || ""
      });
    } else {
      setNewTask({ title: "", description: "", status: "To Do", progress: 0, owner: "" });
    }
    setComment("");
  }, [initialTask]);

  useEffect(() => {
    if (newTask.status !== "In Progress") {
      setNewTask((prev) => ({ ...prev, progress: 0 }));
    }
  }, [newTask.status]);

  const handleChange = (e) => {
    setNewTask({ ...newTask, [e.target.name]: e.target.value });
  };

  const handleOwnerChange = (_, value) => {
    setNewTask({ ...newTask, owner: value ? value.username : "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...newTask };
      if (payload.status !== "In Progress") {
        delete payload.progress;
      }
      if (isEdit && comment) {
        payload.comment = comment;
      }
      if (isAdmin && users && users.length > 0 && !isEdit) {
        payload.owner = newTask.owner || users[0].username;
      }
      if (isEdit && newTask.id) {
        await axios.put(`http://localhost:8001/tasks/${newTask.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post("http://localhost:8001/tasks", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setSnackbar({ open: true, message: "Task saved!", severity: "success" });
      setComment("");
      if (onTaskCreated) onTaskCreated();
    } catch (error) {
      setSnackbar({ open: true, message: "Failed to save task", severity: "error" });
    }
    setLoading(false);
  };

  // Only allow normal users to edit progress (not title/description/status) when editing a task
  const isNormalUser = !isAdmin;
  const isNormalUserEdit = isNormalUser && isEdit;

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>{snackbar.message}</Alert>
      </Snackbar>
      {isAdmin && !isEdit && (
        <Autocomplete
          options={users}
          getOptionLabel={u => u.username}
          value={users.find(u => u.username === newTask.owner) || null}
          onChange={handleOwnerChange}
          renderInput={params => <TextField {...params} label="Assign to user" required />}
          isOptionEqualToValue={(option, value) => option?.username === value?.username}
          sx={{ minWidth: 220 }}
        />
      )}
      <TextField
        name="title"
        label="Title"
        required
        value={newTask.title}
        onChange={handleChange}
        disabled={isNormalUserEdit}
      />
      <TextField
        name="description"
        label="Description"
        value={newTask.description}
        onChange={handleChange}
        disabled={isNormalUserEdit}
      />
      <TextField
        select
        name="status"
        label="Status"
        value={newTask.status}
        onChange={handleChange}
        required
        disabled={isNormalUserEdit}
      >
        <MenuItem value="To Do">To Do</MenuItem>
        <MenuItem value="In Progress">In Progress</MenuItem>
        <MenuItem value="Done">Done</MenuItem>
      </TextField>
      {/* Allow normal users to update progress for their assigned tasks when editing */}
      {((isNormalUserEdit && newTask.status === "In Progress") || (isAdmin && newTask.status === "In Progress")) && (
        <TextField
          type="number"
          name="progress"
          label="Progress %"
          value={newTask.progress}
          onChange={handleChange}
          inputProps={{ min: 0, max: 100 }}
          required
        />
      )}
      {/* Comment input for edit mode */}
      {isEdit && (
        <TextField
          label="Add Comment"
          value={comment}
          onChange={e => setComment(e.target.value)}
          multiline
          minRows={2}
          maxRows={4}
        />
      )}
      <Button
        type="submit"
        variant="contained"
        color="primary"
        sx={{ borderRadius: 2, fontWeight: 600, px: 3, boxShadow: 1 }}
        disabled={loading || (isNormalUser && !isEdit)}
      >
        {loading ? <CircularProgress size={22} color="inherit" /> : isEdit ? "Save" : "Create"}
      </Button>

      {/* Show previous comments and activity log */}
      {isEdit && (
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
      )}
    </Box>
  );
};

export default TaskCreate;
