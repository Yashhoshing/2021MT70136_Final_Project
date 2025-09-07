from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from . import models, schemas, database
# from user_service import models, schemas, database
# import models, database, schemas

import bcrypt
hashed = bcrypt.hashpw(b"testpassword", bcrypt.gensalt())
print(hashed)
print("-----------------")
SECRET_KEY = "your-very-secret-key"
ALGORITHM = "HS256"

models.Base.metadata.create_all(bind=database.engine)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
app = FastAPI()
print("-----------------",app)
# Helper to count users
def get_user_count(db: Session):
    return db.query(models.User).count()


from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  # Or ["POST", "GET", "OPTIONS"], etc.
    allow_headers=["*"],
)




def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_user(db: Session, username: str):
    print(models.User.username)
    print(models.User.id)
    return db.query(models.User).filter(models.User.username == username).first()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(status_code=401, detail="Invalid credentials")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user(db, username=username)
    if user is None:
        raise credentials_exception
    return user


# Allow first user to register as admin if no users exist
@app.post("/register", response_model=schemas.UserOut)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if get_user_count(db) > 0:
        raise HTTPException(status_code=403, detail="Direct registration is disabled. Only Admin can register new users.")
    if get_user(db, user.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    user_obj = models.User(username=user.username, hashed_password=hashed_password, role="Admin")
    db.add(user_obj)
    db.commit()
    db.refresh(user_obj)
    return user_obj

# Only allow admin to register new users
@app.post("/admin/register", response_model=schemas.UserOut)
def admin_register(user: schemas.UserCreate, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        role = payload.get("role", "User")
        print("Admin register attempt by:", username, "with role:", role)
        if role != "Admin":
            raise HTTPException(status_code=403, detail="Only Admin can register new users")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if get_user(db, user.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    reg_role = getattr(user, "role", "User")
    user_obj = models.User(username=user.username, hashed_password=hashed_password, role=reg_role)
    db.add(user_obj)
    db.commit()
    db.refresh(user_obj)
    return user_obj

@app.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = get_user(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    token = create_access_token({"sub": user.username, "role": user.role})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/me", response_model=schemas.UserOut)
def read_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/users/count")
def get_users_count(db: Session = Depends(get_db)):
    count = db.query(models.User).count()
    return {"count": count}