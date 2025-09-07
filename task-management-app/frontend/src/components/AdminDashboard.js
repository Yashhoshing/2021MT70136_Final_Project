import React, { useEffect, useState } from "react";
import axios from "axios";
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Divider, Avatar, List, ListItem, ListItemText } from "@mui/material";
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, LineChart, Line, ResponsiveContainer } from "recharts";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F"];

const AdminDashboard = ({ token, selectedUser }) => {
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState([]);
  const [productivityData, setProductivityData] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [userSummary, setUserSummary] = useState([]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const params = selectedUser ? { user: selectedUser.username } : {};
    Promise.all([
      axios.get("http://localhost:8001/dashboard/status", { headers: { Authorization: `Bearer ${token}` }, params }),
      axios.get("http://localhost:8001/dashboard/productivity", { headers: { Authorization: `Bearer ${token}` }, params }),
      axios.get("http://localhost:8001/dashboard/progress", { headers: { Authorization: `Bearer ${token}` }, params }),
      axios.get("http://localhost:8001/dashboard/upcoming", { headers: { Authorization: `Bearer ${token}` }, params }),
      axios.get("http://localhost:8001/dashboard/user_summary", { headers: { Authorization: `Bearer ${token}` }, params })
    ])
      .then(([statusRes, prodRes, progRes, upcRes, userSumRes]) => {
        setStatusData(statusRes.data);
        setProductivityData(prodRes.data);
        setProgressData(progRes.data);
        setUpcomingTasks(upcRes.data);
        setUserSummary(userSumRes.data);
      })
      .finally(() => setLoading(false));
  }, [token, selectedUser]);

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>Admin Dashboard</Typography>
      <Grid container spacing={3}>
        {/* Task Completion Status Overview */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6">Task Status Overview</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="status" cx="50%" cy="50%" outerRadius={70} label>
                  {statusData.map((entry, idx) => <Cell key={entry.status} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Grid>
        {/* User Productivity Trends */}
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6">User Productivity Trends</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={productivityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="completed" stroke="#8884d8" name="Tasks Completed" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Grid>
        {/* Task Progress Distribution */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6">Task Progress Distribution</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={progressData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#82ca9d" name="Tasks" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>
        {/* Upcoming Deadlines */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6">Upcoming Deadlines (Next 7 Days)</Typography>
            <List>
              {upcomingTasks.length === 0 && <ListItem><ListItemText primary="No upcoming deadlines." /></ListItem>}
              {upcomingTasks.map(task => (
                <ListItem key={task.id}>
                  <ListItemText
                    primary={task.title}
                    secondary={`Due: ${new Date(task.deadline).toLocaleDateString()} | Status: ${task.status}`}
                  />
                </ListItem>
              ))}
            </List>
          </Card>
        </Grid>
        {/* User Activity Summary */}
        <Grid item xs={12}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6">User Activity Summary</Typography>
            <Grid container spacing={2}>
              {userSummary.map(user => (
                <Grid item xs={12} sm={6} md={3} key={user.username}>
                  <Card sx={{ bgcolor: "#f3f6fd", p: 2, textAlign: "center" }}>
                    <Avatar sx={{ mx: "auto", mb: 1 }}>{user.username[0].toUpperCase()}</Avatar>
                    <Typography variant="subtitle1">{user.username}</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2">Assigned: <b>{user.assigned}</b></Typography>
                    <Typography variant="body2">Completed: <b>{user.completed}</b></Typography>
                    <Typography variant="body2">Comments: <b>{user.comments}</b></Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
