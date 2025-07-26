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
      .then((res) => setTasks(res.data));
  }, [token]);

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
          maxWidth: 600,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 8px 48px rgba(76,68,182,0.13)",
          padding: 32,
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
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "Add Task"}
        </button>
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
                .then((res) => setTasks(res.data));
            }}
            initialTask={selectedTask}
          />
        )}
        <table
          style={{ width: "100%", marginTop: 24, borderCollapse: "collapse" }}
        >
          <thead>
            <tr style={{ background: "#f3f0ff" }}>
              <th style={{ padding: 8, textAlign: "left" }}>Name</th>
              <th style={{ padding: 8, textAlign: "left" }}>Description</th>
              <th style={{ padding: 8, textAlign: "left" }}>Created At</th>
              <th style={{ padding: 8, textAlign: "left" }}>Progress</th>
              <th style={{ padding: 8, textAlign: "left" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} style={{ borderBottom: "1px solid #ede9fe" }}>
                <td style={{ padding: 8 }}>
                  <a
                    href="#"
                    style={{
                      color: "#5a67d8",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedTask(task);
                      setShowForm(true);
                    }}
                  >
                    {task.title}
                  </a>
                </td>
                <td style={{ padding: 8 }}>{task.description}</td>
                <td style={{ padding: 8 }}>
                  {new Date(task.created_at).toLocaleString()}
                </td>
                <td style={{ padding: 8, minWidth: 120 }}>
                  <ProgressBar progress={task.progress} status={task.status} />
                </td>
                <td style={{ padding: 8 }}>{task.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskList;
