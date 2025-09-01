import React, { useState, useEffect } from "react";
import axios from "axios";

const TaskCreate = ({ onTaskCreated, initialTask }) => {
  const isEdit = !!initialTask;
  const [newTask, setNewTask] = useState({
    title: initialTask?.title || "",
    description: initialTask?.description || "",
    status: initialTask?.status || "To Do",
    progress: initialTask?.progress ?? 0,
    id: initialTask?.id,
  });
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  // Update form when initialTask changes
  useEffect(() => {
    if (initialTask) {
      setNewTask({
        title: initialTask.title || "",
        description: initialTask.description || "",
        status: initialTask.status || "To Do",
        progress: initialTask.progress ?? 0,
        id: initialTask.id,
      });
    } else {
      setNewTask({ title: "", description: "", status: "To Do", progress: 0 });
    }
  }, [initialTask]);

  // Reset progress when status changes
  useEffect(() => {
    if (newTask.status !== "In Progress") {
      setNewTask((prev) => ({ ...prev, progress: 0 }));
    }
  }, [newTask.status]);

  const handleChange = (e) =>
    setNewTask({ ...newTask, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...newTask };
      if (payload.status !== "In Progress") {
        delete payload.progress;
      }
      if (isEdit && newTask.id) {
        // Edit mode: update task
        await axios.put(`http://localhost:8001/tasks/${newTask.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create mode: create new task
        await axios.post("http://localhost:8001/tasks", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (onTaskCreated) onTaskCreated();
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Failed to save task");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="title"
        placeholder="Title"
        required
        style={{ margin: 6, padding: 6 }}
        value={newTask.title}
        onChange={handleChange}
      />
      <input
        name="description"
        placeholder="Description"
        style={{ margin: 6, padding: 6 }}
        value={newTask.description}
        onChange={handleChange}
      />
      <select
        name="status"
        value={newTask.status}
        onChange={handleChange}
        style={{ margin: 6, padding: 6 }}
        disabled={!isEdit}
      >
        <option>To Do</option>
        {isEdit && <option>In Progress</option>}
        {isEdit && <option>Done</option>}
      </select>

      {newTask.status === "In Progress" && (
        <input
          type="number"
          min="0"
          max="100"
          name="progress"
          value={newTask.progress}
          onChange={handleChange}
          placeholder="Progress %"
          style={{ margin: 6, padding: 6 }}
          required
        />
      )}

      <button
        type="submit"
        style={{
          background: "#a18cd1",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "8px 18px",
          marginLeft: 6,
        }}
        disabled={loading}
      >
        {isEdit
          ? loading
            ? "Saving..."
            : "Save"
          : loading
          ? "Creating..."
          : "Create"}
      </button>
    </form>
  );
};

export default TaskCreate;
