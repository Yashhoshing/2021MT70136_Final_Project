pipeline {
  agent any
  environment {
    DOCKERHUB_USER = 'YH12Devops' // Set your Docker Hub username
    DOCKERHUB_PASS = credentials('dockerhub-password-id') // Jenkins credential ID for Docker Hub password
    BACKEND_IMAGE = "docker.io/${DOCKERHUB_USER}/taskmgmt-backend:latest"
    USER_IMAGE = "docker.io/${DOCKERHUB_USER}/taskmgmt-user-backend:latest"
    FRONTEND_IMAGE = "docker.io/${DOCKERHUB_USER}/taskmgmt-frontend:latest"
    BACKEND_DIR = 'task-management-app/backend/task_service'
    USER_DIR = 'task-management-app/backend/user_service'
    FRONTEND_DIR = 'task-management-app/frontend'
  }
  stages {
    stage('Checkout: SCM') {
      steps {
        checkout scm
      }
    }
    
    stage('Build Docker Images') {
      steps {
        bat "docker build -t %BACKEND_IMAGE% ./%BACKEND_DIR%"
        bat "docker build -t %USER_IMAGE% ./%USER_DIR%"
        bat "docker build -t %FRONTEND_IMAGE% ./%FRONTEND_DIR%"
      }
    }
    stage('Login to Docker Hub') {
      steps {
        bat "echo %DOCKERHUB_PASS% | docker login docker.io -u %DOCKERHUB_USER% --password-stdin"
      }
    }
    stage('Push Images to Docker Hub') {
      steps {
        bat "docker push %BACKEND_IMAGE%"
        bat "docker push %USER_IMAGE%"
        bat "docker push %FRONTEND_IMAGE%"
      }
    }
    stage('Run Backend Tests') {
      steps {
        bat "cd %USER_DIR% && pytest test_auth.py --maxfail=1 --disable-warnings"
        bat "cd %BACKEND_DIR% && pytest test_task.py --maxfail=1 --disable-warnings"
      }
    }
    stage('Run Containers') {
      steps {
        bat "docker rm -f backend || exit 0"
        bat "docker rm -f userbackend || exit 0"
        bat "docker rm -f frontend || exit 0"
        bat "docker run -d --name backend -p 8000:8000 %BACKEND_IMAGE%"
        bat "docker run -d --name userbackend -p 8001:8000 %USER_IMAGE%"
        bat "docker run -d --name frontend -p 3000:3000 %FRONTEND_IMAGE%"
      }
    }
  }
  post {
    always {
      bat "docker rm -f backend || exit 0"
      bat "docker rm -f userbackend || exit 0"
      bat "docker rm -f frontend || exit 0"
      cleanWs()
    }
  }
}

