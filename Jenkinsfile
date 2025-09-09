pipeline {
  agent any
  environment {
    TASK_BACKEND_DIR = 'task-management-app/backend/task_service'
    USER_BACKEND_DIR = 'task-management-app/backend/user_service'
    FRONTEND_DIR = 'task-management-app/frontend'
  }
  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }
    stage('Task Service: Install & Test') {
      steps {
        dir(env.TASK_BACKEND_DIR) {
          sh 'pip install --upgrade pip'
          sh 'pip install -r requirements.txt'
          sh 'pytest'
        }
      }
    }
    stage('User Service: Install & Test') {
      steps {
        dir(env.USER_BACKEND_DIR) {
          sh 'pip install --upgrade pip'
          sh 'pip install -r requirements.txt'
          sh 'pytest'
        }
      }
    }
// Jenkins Pipeline: Build Docker Images Only
// This pipeline checks out the code and builds Docker images for task_service, user_service, and frontend.
// No tests or analysis are run. Use this to verify Docker builds work before adding more steps.
