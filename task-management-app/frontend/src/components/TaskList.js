import React, { useEffect, useState } from "react";
import axios from "axios";
import TaskCreate from "./TaskCreate";

const ProgressBar = ({ progress, status }) => {
  if (status === "Done") {
    progress = 100; // Completion implies 100%
  }
  let bgColor = "#ef4444"; // red
  if (progress > 70) bgColor = "#22c55e"; // green
  else if (progress > 30) bgColor = "#facc15"; // yellow

  return (
    <div
      style={{
        height: 16,
        width: "100%",
        backgroundColor: "#ddd",
        borderRadius: 8,
        overflow: "hidden",
        marginTop: 6,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          backgroundColor: bgColor,
          transition: "width 0.3s ease-in-out",
          textAlign: "center",
          color: "#000",
          fontWeight: "bold",
          fontSize: 12,
          lineHeight: "16px",
          userSelect: "none",
        }}
      >
        {progress}%
      </div>
    </div>
  );
};


const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedTaskIdx, setSelectedTaskIdx] = useState(0);
  const [selectedTask, setSelectedTask] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }
    axios
      .get("http://localhost:8001/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setTasks(res.data);
        // Ensure selectedTaskIdx is always valid
        setSelectedTaskIdx(idx => {
          if (res.data.length === 0) return 0;
          if (idx >= res.data.length) return res.data.length - 1;
          return idx;
        });
      });
  }, [token]);

  // Tab switching handler
  const handleTabClick = (idx) => {
    setSelectedTaskIdx(idx);
    setSelectedTask(null);
    setShowForm(false);
  };

  // Show form for editing selected task
  const handleEditClick = () => {
    setSelectedTask(tasks[selectedTaskIdx]);
    setShowForm(true);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)",
        padding: "32px",
      }}
    >
      <div
        style={{
          maxWidth: 1000,
          minHeight: 700,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 8px 48px rgba(76,68,182,0.13)",
          padding: 48,
        }}
      >
        <h2 style={{ color: "#434190" }}>Your Tasks</h2>
        <button
          style={{
            background: "#667eea",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 18px",
            margin: "12px 0 18px 0",
            cursor: "pointer",
            fontWeight: 600,
          }}
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setSelectedTask(null);
            } else {
              setShowForm(true);
              setSelectedTask(null); // Always open blank form for Add Task
            }
          }}
        >
          {showForm ? "Cancel" : "Add Task"}
        </button>
        {/* Tabs for each task */}
  <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto", flexWrap: "nowrap" }}>
          {tasks.map((task, idx) => (
            <button
              key={task.id}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: selectedTaskIdx === idx ? "2px solid #667eea" : "1px solid #e0e7ef",
                background: selectedTaskIdx === idx ? "#e0e7ff" : "#f8fafc",
                color: selectedTaskIdx === idx ? "#434190" : "#555",
                fontWeight: selectedTaskIdx === idx ? 700 : 500,
                cursor: "pointer",
                minWidth: 80,
                transition: "all 0.2s",
              }}
              onClick={() => handleTabClick(idx)}
            >
              {task.title}
            </button>
          ))}
        </div>
        {/* Show selected task details */}
        {tasks.length > 0 && !showForm && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ color: "#667eea", marginBottom: 8 }}>{tasks[selectedTaskIdx].title}</h3>
            <div style={{ marginBottom: 8 }}><strong>Description:</strong> {tasks[selectedTaskIdx].description}</div>
            <div style={{ marginBottom: 8 }}><strong>Created At:</strong> {new Date(tasks[selectedTaskIdx].created_at).toLocaleString()}</div>
            <div style={{ marginBottom: 8 }}><strong>Status:</strong> {tasks[selectedTaskIdx].status}</div>
            <div style={{ marginBottom: 8 }}><strong>Progress:</strong> <ProgressBar progress={tasks[selectedTaskIdx].progress} status={tasks[selectedTaskIdx].status} /></div>
            <button
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                marginTop: 8,
                cursor: "pointer",
                fontWeight: 600,
              }}
              onClick={handleEditClick}
            >
              Edit Task
            </button>
          </div>
        )}
        {/* Show form for add/edit */}
        {showForm && (
          <TaskCreate
            onTaskCreated={() => {
              setShowForm(false);
              setSelectedTask(null);
              // Refresh tasks after creation
              axios
                .get("http://localhost:8001/tasks", {
                  headers: { Authorization: `Bearer ${token}` },
                })
                .then((res) => {
                  setTasks(res.data);
                  // If there are tasks, select the last one, else select 0
                  setSelectedTaskIdx(res.data.length > 0 ? res.data.length - 1 : 0);
                });
            }}
            initialTask={selectedTask}
          />
        )}
      </div>
    </div>
  );
};

export default TaskList;
