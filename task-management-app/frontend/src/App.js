import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Register from "./components/Register";
import Login from "./components/Login";
import TaskList from "./components/TaskList";
import UserList from "./components/UserList";

function App() {
  return (
    <BrowserRouter>
      <Routes>
  <Route path="/register" element={<Register />} />
  <Route path="/admin/register" element={<Register isAdminRegister={true} />} />
  <Route path="/login" element={<Login />} />
  <Route path="/tasks" element={<TaskList />} />
  <Route path="/users" element={<UserList />} />
  <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
