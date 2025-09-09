pipeline {
  agent any
  environment {
    TASK_BACKEND_DIR = 'task-management-app/backend/task_service'
    USER_BACKEND_DIR = 'task-management-app/backend/user_service'
    FRONTEND_DIR = 'task-management-app/frontend'
  }
  stages {
    stage('Checkout: SCM') {
      steps {
        checkout scm
      }
    }
    stage('Build Docker Images: Task Backend, User Backend, Frontend') {
      steps {
        sh 'docker build -t taskmgmt-task-backend:latest ./task-management-app/backend/task_service'
        sh 'docker build -t taskmgmt-user-backend:latest ./task-management-app/backend/user_service'
        sh 'docker build -t taskmgmt-frontend:latest ./task-management-app/frontend'
      }
    }
  }
  post {
    always {
      cleanWs()
    }
  }
}
