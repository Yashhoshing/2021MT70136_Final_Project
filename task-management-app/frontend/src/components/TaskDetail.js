import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const ProgressBar = ({ progress, status }) => {
  if (status === "Done") {
    progress = 100;
  }
  let bgColor = "#ef4444";
  if (progress > 70) bgColor = "#22c55e";
  else if (progress > 30) bgColor = "#facc15";

  return (
    <div
      style={{
        height: 20,
        width: "100%",
        backgroundColor: "#ddd",
        borderRadius: 8,
        overflow: "hidden",
        marginTop: 8,
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
          fontSize: 14,
          lineHeight: "20px",
          userSelect: "none",
        }}
      >
        {progress}%
      </div>
    </div>
  );
};

const TaskDetail = () => {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await axios.get(`http://localhost:8001/tasks/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTask(response.data);
        setProgress(response.data.progress || 0);
      } catch (error) {
        console.error("Error fetching task details:", error);
      }
    };
    fetchTask();
  }, [id, token]);

  const handleProgressChange = (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val)) val = 0;
    if (val < 0) val = 0;
    if (val > 100) val = 100;
    setProgress(val);
  };

  const handleProgressUpdate = async () => {
    setLoading(true);
    try {
      await axios.put(
        `http://localhost:8001/tasks/${id}`,
        { progress, status: "In Progress" },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // Refresh task details after update
      const res = await axios.get(`http://localhost:8001/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTask(res.data);
      alert("Progress updated successfully.");
    } catch (error) {
      alert("Failed to update progress.");
    }
    setLoading(false);
  };

  if (!task) {
    return <p>Loading task details...</p>;
  }

  return (
    <div style={{ maxWidth: 600, margin: "auto", padding: 20 }}>
      <h2>Task Details</h2>
      <p>
        <strong>Title:</strong> {task.title}
      </p>
      <p>
        <strong>Description:</strong> {task.description}
      </p>
      <p>
        <strong>Status:</strong> {task.status}
      </p>
      <p>
        <strong>Created At:</strong> {new Date(task.created_at).toLocaleString()}
      </p>
      {task.completed_at && (
        <p>
          <strong>Completed At:</strong> {new Date(task.completed_at).toLocaleString()}
        </p>
      )}

      {/* Progress bar and update input if status is "In Progress" */}
      <ProgressBar progress={task.progress} status={task.status} />
      {task.status === "In Progress" && (
        <div style={{ marginTop: 12 }}>
          <label>
            Update Progress (%):
            <input
              type="number"
              min="0"
              max="100"
              value={progress}
              onChange={handleProgressChange}
              style={{ marginLeft: 8, width: 60 }}
            />
          </label>
          <button
            onClick={handleProgressUpdate}
            disabled={loading}
            style={{ marginLeft: 12, padding: "6px 12px" }}
          >
            {loading ? "Saving..." : "Save Progress"}
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskDetail;
