import React, { useState, useEffect } from "react";
import axios from "axios";
import { Box, Button, TextField, MenuItem, CircularProgress, Autocomplete, Snackbar, Alert } from "@mui/material";

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
  const token = localStorage.getItem("token");

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
      {((isNormalUserEdit && newTask.status === "In Progress") || (isAdmin && isEdit && newTask.status === "In Progress") || (isAdmin && !isEdit && newTask.status === "In Progress")) && (
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
      <Button
        type="submit"
        variant="contained"
        color="primary"
        sx={{ borderRadius: 2, fontWeight: 600, px: 3, boxShadow: 1 }}
        disabled={loading || (isNormalUser && !isEdit)}
      >
        {loading ? <CircularProgress size={22} color="inherit" /> : isEdit ? "Save" : "Create"}
      </Button>
    </Box>
  );
};

export default TaskCreate;
