# pyre-ignore-all-errors
from fastapi import FastAPI, HTTPException, Depends, status, Header, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Enum, ForeignKey, Boolean, DateTime, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
import enum
import os
import secrets
from typing import Annotated

# --- Security & JWT Config ---
SECRET_KEY = "super-secret-desk-replacer-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 day
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Database Setup ---
DATABASE_URL = "postgresql://postgres:Gabriel88.@34.39.140.183:5432/deskdb"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class StatusDB(Base):
    __tablename__ = "statuses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

class ProfileDB(Base):
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # e.g. "Admin", "User"

class UserDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    full_name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True)
    area_code = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    accepts_email_notifications = Column(Boolean, default=False)
    hashed_password = Column(String)
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    profile = relationship("ProfileDB")

class TicketCategoryDB(Base):
    __tablename__ = "ticket_categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

class TicketTypeDB(Base):
    __tablename__ = "ticket_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category_id = Column(Integer, ForeignKey("ticket_categories.id"))
    category = relationship("TicketCategoryDB")

class SprintDB(Base):
    __tablename__ = "sprints"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    status = Column(String, default="Active") # Active, Closed, Planned
    goal = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    tickets = relationship("TicketDB", back_populates="sprint")

class TicketDB(Base):
    __tablename__ = "tickets"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    status_id = Column(Integer, ForeignKey("statuses.id"))
    status = relationship("StatusDB")
    type_id = Column(Integer, ForeignKey("ticket_types.id"), nullable=True)
    type = relationship("TicketTypeDB")
    
    # DevOps Fields
    sprint_id = Column(Integer, ForeignKey("sprints.id"), nullable=True)
    sprint = relationship("SprintDB", back_populates="tickets")
    estimated_hours = Column(Float, default=0.0)
    spent_hours = Column(Float, default=0.0)
    priority = Column(String, default="Medium") # Low, Medium, High, Critical
    
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=True) # nullable for backwards compat
    creator = relationship("UserDB")
    interactions = relationship("TicketInteractionDB", back_populates="ticket", cascade="all, delete-orphan")
    created_at = Column(DateTime, server_default=func.now())

class TicketInteractionDB(Base):
    __tablename__ = "ticket_interactions"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    author_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String)
    created_at = Column(DateTime, server_default=func.now())

    ticket = relationship("TicketDB", back_populates="interactions")
    author = relationship("UserDB")

class ApiKeyDB(Base):
    __tablename__ = "api_keys"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    key_hash = Column(String, unique=True, index=True)
    name = Column(String)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("UserDB")

# Removed Base.metadata.drop_all(bind=engine) to prevent data loss on restarts
Base.metadata.create_all(bind=engine)

# --- Pydantic Models ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

class TicketCreate(BaseModel):
    title: str
    description: str
    type_id: int | None = None
    sprint_id: int | None = None
    estimated_hours: float = 0.0
    priority: str = "Medium"

class TicketUpdate(BaseModel):
    status_id: int
    sprint_id: int | None = None
    estimated_hours: float | None = None
    priority: str | None = None

class SprintCreate(BaseModel):
    name: str
    start_date: datetime
    end_date: datetime
    goal: str | None = None

class SprintUpdate(BaseModel):
    name: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    status: str | None = None
    goal: str | None = None

class SprintResponse(BaseModel):
    id: int
    name: str
    start_date: datetime
    end_date: datetime
    status: str
    goal: str | None = None
    created_at: datetime
    class Config:
        orm_mode = True

class TimeLogCreate(BaseModel):
    hours: float
    description: str | None = None

class ProfileResponse(BaseModel):
    id: int
    name: str
    class Config:
        orm_mode = True

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str | None = None
    email: str | None = None
    area_code: str | None = None
    phone: str | None = None
    accepts_email_notifications: bool = False

class AdminUserCreate(UserCreate):
    profile_id: int

class UserUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    area_code: str | None = None
    phone: str | None = None
    accepts_email_notifications: bool | None = None
    profile_id: int | None = None

class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str | None = None
    email: str | None = None
    area_code: str | None = None
    phone: str | None = None
    accepts_email_notifications: bool = False
    profile: ProfileResponse
    class Config:
        orm_mode = True

class ApiKeyResponse(BaseModel):
    id: int
    name: str
    created_at: datetime

    class Config:
        orm_mode = True

class ApiKeyCreate(BaseModel):
    name: str

class StatusResponse(BaseModel):
    id: int
    name: str
    class Config:
        orm_mode = True

class TicketCategoryCreate(BaseModel):
    name: str

class TicketCategoryResponse(BaseModel): # Root for circularity
    id: int
    name: str
    class Config:
        orm_mode = True

class TicketTypeCreate(BaseModel):
    name: str
    category_id: int

class TicketTypeResponse(BaseModel):
    id: int
    name: str
    category_id: int
    category: TicketCategoryResponse | None = None
    class Config:
        orm_mode = True

class TicketCategoryFullResponse(TicketCategoryResponse):
    types: list[TicketTypeResponse] = []

class InteractionCreate(BaseModel):
    content: str

class InteractionResponse(BaseModel):
    id: int
    content: str
    created_at: datetime
    author: UserResponse

    class Config:
        orm_mode = True

class TicketResponse(BaseModel):
    id: int
    title: str
    description: str
    status: StatusResponse
    type: TicketTypeResponse | None = None
    creator: UserResponse | None = None
    interactions: list[InteractionResponse] = []
    
    # DevOps Fields
    sprint_id: int | None = None
    sprint: SprintResponse | None = None
    estimated_hours: float = 0.0
    spent_hours: float = 0.0
    priority: str = "Medium"
    created_at: datetime

    class Config:
        orm_mode = True

# --- Dependencies ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(request: Request, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # 1. Check for API Key in header
    api_key_header = request.headers.get("X-API-KEY")
    if api_key_header:
        # We store hashes. We need to check all keys? No, an API Key should ideally carry an ID prefix like 'id:secret'.
        # Since we didn't enforce a prefix, and bcrypt is slow, we can't iterate over all keys.
        # Let's change our strategy: The generated token will actually be a JWT with a very long expiration!
        # OR, we simply use `secrets.token_hex` and store it plainly in the DB for this MVP.
        # Given this is a local project replacing an old desk, let's store `key_hash` as plain string for simplicity,
        # but name it `key_hash` so it can be migrated later. So `api_key_header` must exactly match `key_hash`.
        api_key_record = db.query(ApiKeyDB).filter(ApiKeyDB.key_hash == api_key_header).first()
        if api_key_record:
            return api_key_record.user
        else:
            raise HTTPException(status_code=401, detail="Invalid API Key")

    # 2. Extract Bearer token manually (since OAuth2Scheme isn't handling it automatically in Depends anymore)
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise credentials_exception
        
    token = auth_header.split(" ")[1]
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = db.query(UserDB).filter(UserDB.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

# --- FastAPI App ---
app = FastAPI(title="Desk API Replacer")

# Mount static folder for frontend (HTML/JS/CSS)
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.on_event("startup")
def create_initial_data():
    db = SessionLocal()
    
    # Create default statuses
    default_statuses = [
        "Aguardando atendimento",
        "Em atendimento",
        "Aguardando terceiros",
        "Aguardando testes",
        "Concluido"
    ]
    for s_name in default_statuses:
        status_obj = db.query(StatusDB).filter(StatusDB.name == s_name).first()
        if not status_obj:
            new_status = StatusDB(name=s_name)
            db.add(new_status)
            db.commit()

    # Create default categories and types
    default_classifications = {
        "Solicitação / Atendimento": ["Consulta", "Dúvida", "Orçamento", "Avaliação"],
        "Execução de Serviço": ["Serviço", "Suporte", "Correção", "Teste"],
        "Melhoria": ["Melhorar desempenho", "Melhorar layout", "Otimizar processo"],
        "Implementação": ["Criar relatório", "Adicionar funcionalidade", "Integrar sistema"],
        "Bug / Erro": ["Sistema travando", "Cálculo errado", "Botão não funciona"],
        "Acesso": ["Criar usuário", "Alterar permissões", "Liberar acesso"],
        "Alteração": ["Alterar cadastro", "Modificar configuração", "Trocar parâmetro"],
        "Relatório": ["Exportar dados", "Gerar relatório", "Análise de informação"]
    }
    
    for cat_name, types in default_classifications.items():
        cat_obj = db.query(TicketCategoryDB).filter(TicketCategoryDB.name == cat_name).first()
        if not cat_obj:
            cat_obj = TicketCategoryDB(name=cat_name)
            db.add(cat_obj)
            db.commit()
            db.refresh(cat_obj)
        
        for type_name in types:
            type_obj = db.query(TicketTypeDB).filter(TicketTypeDB.name == type_name, TicketTypeDB.category_id == cat_obj.id).first()
            if not type_obj:
                new_type = TicketTypeDB(name=type_name, category_id=cat_obj.id)
                db.add(new_type)
                db.commit()

    # Create default profiles
    default_profiles = ["Administrator", "Solicitante", "Operador"]
    for p_name in default_profiles:
        prof_obj = db.query(ProfileDB).filter(ProfileDB.name == p_name).first()
        if not prof_obj:
            new_prof = ProfileDB(name=p_name)
            db.add(new_prof)
            db.commit()

    admin_prof = db.query(ProfileDB).filter(ProfileDB.name == "Administrator").first()
        
    admin_user = db.query(UserDB).filter(UserDB.username == "admin").first()
    if not admin_user:
        admin_prof = db.query(ProfileDB).filter(ProfileDB.name == "Administrator").first()
        admin_user = UserDB(
            username="admin", 
            hashed_password=get_password_hash("admin"), 
            profile_id=admin_prof.id, 
            full_name="Administrador Master", 
            email="admin@system.com", 
            area_code="11", 
            phone="999999999", 
            accepts_email_notifications=True
        )
        db.add(admin_user)
        db.commit()

    soli_user = db.query(UserDB).filter(UserDB.username == "solicitante_teste").first()
    if not soli_user:
        sol_prof = db.query(ProfileDB).filter(ProfileDB.name == "Solicitante").first()
        if sol_prof:
            soli_user = UserDB(username="solicitante_teste", hashed_password=get_password_hash("123456"), profile_id=sol_prof.id, full_name="Solicitante Teste", email="solicitante@teste.com", area_code="11", phone="888888888", accepts_email_notifications=False)
            db.add(soli_user)
            db.commit()

    op_user = db.query(UserDB).filter(UserDB.username == "operador_teste").first()
    if not op_user:
        op_prof = db.query(ProfileDB).filter(ProfileDB.name == "Operador").first()
        if op_prof:
            op_user = UserDB(username="operador_teste", hashed_password=get_password_hash("123456"), profile_id=op_prof.id, full_name="Operador Teste", email="operador@teste.com", area_code="11", phone="777777777", accepts_email_notifications=True)
            db.add(op_user)
            db.commit()

    db.close()

@app.get("/")
def serve_index():
    return FileResponse(os.path.join(static_dir, "landing.html"))

@app.get("/login")
def serve_login():
    return FileResponse(os.path.join(static_dir, "login.html"))

@app.get("/register")
def serve_register():
    return FileResponse(os.path.join(static_dir, "register.html"))

@app.get("/forgot-password")
def serve_forgot_password():
    return FileResponse(os.path.join(static_dir, "forgot-password.html"))

@app.get("/reset-success")
def serve_reset_success():
    return FileResponse(os.path.join(static_dir, "reset-success.html"))

@app.get("/dashboard")
def serve_dashboard():
    return FileResponse(os.path.join(static_dir, "dashboard.html"))

@app.get("/profile")
def serve_profile():
    return FileResponse(os.path.join(static_dir, "profile.html"))

@app.get("/users")
def serve_users():
    return FileResponse(os.path.join(static_dir, "users.html"))

@app.get("/config", include_in_schema=False)
def serve_config():
    return FileResponse(os.path.join(static_dir, "config.html"))

@app.get("/types", include_in_schema=False)
def serve_types():
    return FileResponse(os.path.join(static_dir, "types.html"))

@app.get("/categories", include_in_schema=False)
def serve_categories():
    return FileResponse(os.path.join(static_dir, "categories.html"))

@app.get("/sprints")
def serve_sprints():
    return FileResponse(os.path.join(static_dir, "sprints.html"))

@app.get("/reports")
def serve_reports():
    return FileResponse(os.path.join(static_dir, "reports.html"))

@app.get("/api_management", include_in_schema=False)
def serve_api_management():
    return FileResponse(os.path.join(static_dir, "api_management.html"))

@app.get("/api_docs", include_in_schema=False)
def serve_api_docs():
    return FileResponse(os.path.join(static_dir, "api_docs.html"))

@app.get("/reports", include_in_schema=False)
def serve_reports():
    return FileResponse(os.path.join(static_dir, "reports.html"))

@app.get("/report_dashboard", include_in_schema=False)
def serve_report_dashboard():
    return FileResponse(os.path.join(static_dir, "report_dashboard.html"))


# --- API Endpoints ---
@app.post("/api/auth/register", response_model=UserResponse, tags=["Authentication"])
def register_user(user_in: UserCreate, db = Depends(get_db)):
    # Check if username exists
    existing_user = db.query(UserDB).filter(UserDB.username == user_in.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
        
    # Check if email exists
    if user_in.email:
        existing_email = db.query(UserDB).filter(UserDB.email == user_in.email).first()
        if existing_email:
             raise HTTPException(status_code=400, detail="Email already registered")

    # Get default 'Solicitante' profile
    sol_prof = db.query(ProfileDB).filter(ProfileDB.name == "Solicitante").first()
    if not sol_prof:
        raise HTTPException(status_code=500, detail="Default profile not found")

    hashed_pwd = get_password_hash(user_in.password)
    new_user = UserDB(
        username=user_in.username,
        hashed_password=hashed_pwd,
        profile_id=sol_prof.id,
        full_name=user_in.full_name,
        email=user_in.email,
        area_code=user_in.area_code,
        phone=user_in.phone,
        accepts_email_notifications=user_in.accepts_email_notifications
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/auth/login", response_model=Token, tags=["Authentication"])
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserResponse, tags=["Authentication"])
def get_me(current_user: UserDB = Depends(get_current_user)):
    return current_user

# --- API Tokens ---
@app.get("/api/tokens", response_model=list[ApiKeyResponse], tags=["API Management"])
def list_tokens(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    """List all API tokens for the logged in user."""
    return db.query(ApiKeyDB).filter(ApiKeyDB.user_id == current_user.id).all()

@app.post("/api/tokens/create", tags=["API Management"])
def create_token(token_in: ApiKeyCreate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    """Create a new API Token. The actual token string is only returned once."""
    raw_token = "stitch_" + secrets.token_hex(24)
    new_token = ApiKeyDB(
        user_id=current_user.id,
        key_hash=raw_token,
        name=token_in.name
    )
    db.add(new_token)
    db.commit()
    db.refresh(new_token)
    
    return {
        "id": new_token.id,
        "name": new_token.name,
        "created_at": new_token.created_at,
        "raw_token": raw_token
    }

@app.delete("/api/tokens/{token_id}", tags=["API Management"])
def delete_token(token_id: int, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    """Revokes an API Key."""
    token = db.query(ApiKeyDB).filter(ApiKeyDB.id == token_id, ApiKeyDB.user_id == current_user.id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    db.delete(token)
    db.commit()
    return {"detail": "Token revoked"}

@app.get("/api/profiles", response_model=list[ProfileResponse], tags=["Users & Profiles"])
def get_profiles(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.profile.name == "Solicitante":
        raise HTTPException(status_code=403, detail="Not authorized to view profiles")
    return db.query(ProfileDB).all()

@app.post("/api/users", response_model=UserResponse, tags=["Users & Profiles"])
def create_admin_user(user_in: AdminUserCreate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    """ Admin User Creation """
    if current_user.profile.name != "Administrator":
        raise HTTPException(status_code=403, detail="Only Administrators can create new users")
    
    existing_user = db.query(UserDB).filter(UserDB.username == user_in.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
        
    if user_in.email:
        existing_email = db.query(UserDB).filter(UserDB.email == user_in.email).first()
        if existing_email:
             raise HTTPException(status_code=400, detail="Email already registered")

    prof = db.query(ProfileDB).filter(ProfileDB.id == user_in.profile_id).first()
    if not prof:
        raise HTTPException(status_code=400, detail="Profile ID not found")

    hashed_pwd = get_password_hash(user_in.password)
    new_user = UserDB(
        username=user_in.username,
        hashed_password=hashed_pwd,
        profile_id=prof.id,
        full_name=user_in.full_name,
        email=user_in.email,
        area_code=user_in.area_code,
        phone=user_in.phone,
        accepts_email_notifications=user_in.accepts_email_notifications
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/api/statuses", response_model=list[StatusResponse], tags=["Tickets"])
def get_statuses(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.profile.name == "Solicitante":
        raise HTTPException(status_code=403, detail="Not authorized to view statuses")
    return db.query(StatusDB).all()

@app.get("/api/users", response_model=list[UserResponse], tags=["Users & Profiles"])
def get_all_users(
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.profile.name == "Solicitante":
        raise HTTPException(status_code=403, detail="Not authorized to view users")
    return db.query(UserDB).all()

@app.patch("/api/users/{user_id}", response_model=UserResponse, tags=["Users & Profiles"])
def update_user(user_id: int, user_in: UserUpdate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.profile.name != "Administrator" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only edit your own profile")
        
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_in.profile_id is not None:
        if current_user.profile.name != "Administrator":
            raise HTTPException(status_code=403, detail="Only Administrators can change profiles")
        prof = db.query(ProfileDB).filter(ProfileDB.id == user_in.profile_id).first()
        if not prof:
            raise HTTPException(status_code=400, detail="Profile ID not found")
        user.profile_id = user_in.profile_id
        
    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.email is not None:
        user.email = user_in.email
    if user_in.area_code is not None:
        user.area_code = user_in.area_code
    if user_in.phone is not None:
        user.phone = user_in.phone
    if user_in.accepts_email_notifications is not None:
        user.accepts_email_notifications = user_in.accepts_email_notifications
        
    db.commit()
    db.refresh(user)
    return user

@app.get("/api/tickets", response_model=list[TicketResponse], tags=["Tickets"])
def get_tickets(db = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.profile.name == "Solicitante":
        tickets = db.query(TicketDB).filter(TicketDB.creator_id == current_user.id).all()
    else:
        tickets = db.query(TicketDB).all()
    return tickets

@app.get("/api/categories", response_model=list[TicketCategoryFullResponse], tags=["Tickets"])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(TicketCategoryDB).all()
    types = db.query(TicketTypeDB).all()
    
    cats_list = []
    for cat in categories:
        cat_data = {
            "id": cat.id,
            "name": cat.name,
            "types": [ {"id": t.id, "name": t.name, "category_id": t.category_id} for t in types if t.category_id == cat.id ]
        }
        cats_list.append(cat_data)
    return cats_list

@app.post("/api/tickets", response_model=TicketResponse, tags=["Tickets"])
def create_ticket(ticket: TicketCreate, db = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.profile.name == "Operador":
        raise HTTPException(status_code=403, detail="Operadores cannot create new tickets.")
    
    default_status = db.query(StatusDB).filter(StatusDB.name == "Aguardando atendimento").first()
    db_ticket = TicketDB(
        title=ticket.title, 
        description=ticket.description, 
        status_id=default_status.id, 
        type_id=ticket.type_id,
        creator_id=current_user.id,
        sprint_id=ticket.sprint_id if ticket.sprint_id != 0 else None,
        estimated_hours=ticket.estimated_hours,
        priority=ticket.priority
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

@app.patch("/api/tickets/{ticket_id}", response_model=TicketResponse, tags=["Tickets"])
def update_ticket(ticket_id: int, ticket_update: TicketUpdate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.profile.name == "Solicitante":
        raise HTTPException(status_code=403, detail="Solicitantes cannot update tickets.")
        
    db_ticket = db.query(TicketDB).filter(TicketDB.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket_update.status_id:
        status_exists = db.query(StatusDB).filter(StatusDB.id == ticket_update.status_id).first()
        if not status_exists:
             raise HTTPException(status_code=400, detail="Invalid status ID")
        db_ticket.status_id = ticket_update.status_id
        
    if ticket_update.sprint_id is not None:
        if ticket_update.sprint_id != 0:
            sprint_exists = db.query(SprintDB).filter(SprintDB.id == ticket_update.sprint_id).first()
            if not sprint_exists:
                raise HTTPException(status_code=400, detail="Invalid sprint ID")
            db_ticket.sprint_id = ticket_update.sprint_id
        else:
            db_ticket.sprint_id = None # Backlog
            
    if ticket_update.estimated_hours is not None:
        db_ticket.estimated_hours = ticket_update.estimated_hours
        
    if ticket_update.priority:
        db_ticket.priority = ticket_update.priority
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

@app.post("/api/tickets/{ticket_id}/log-time", response_model=TicketResponse, tags=["Tickets"])
def log_ticket_time(ticket_id: int, time_log: TimeLogCreate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    db_ticket = db.query(TicketDB).filter(TicketDB.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    db_ticket.spent_hours += time_log.hours
    
    # Also add a system interaction for the log
    log_content = f"🕒 Registrou {time_log.hours}h de trabalho."
    if time_log.description:
        log_content += f"\nDescrição: {time_log.description}"
        
    db_interaction = TicketInteractionDB(
        ticket_id=ticket_id,
        author_id=current_user.id,
        content=log_content
    )
    db.add(db_interaction)
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

# --- Sprint Endpoints ---

@app.get("/api/sprints", response_model=list[SprintResponse], tags=["Sprints"])
def get_sprints(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    return db.query(SprintDB).order_by(SprintDB.created_at.desc()).all()

@app.post("/api/sprints", response_model=SprintResponse, tags=["Sprints"])
def create_sprint(sprint: SprintCreate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.profile.name != "Administrator":
        raise HTTPException(status_code=403, detail="Only admins can create Sprints.")
        
    db_sprint = SprintDB(
        name=sprint.name,
        start_date=sprint.start_date,
        end_date=sprint.end_date,
        goal=sprint.goal
    )
    db.add(db_sprint)
    db.commit()
    db.refresh(db_sprint)
    return db_sprint

@app.patch("/api/sprints/{sprint_id}", response_model=SprintResponse, tags=["Sprints"])
def update_sprint(sprint_id: int, sprint_in: SprintUpdate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.profile.name != "Administrator":
        raise HTTPException(status_code=403, detail="Only admins can update Sprints.")
        
    db_sprint = db.query(SprintDB).filter(SprintDB.id == sprint_id).first()
    if not db_sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
        
    if sprint_in.name is not None: db_sprint.name = sprint_in.name
    if sprint_in.start_date is not None: db_sprint.start_date = sprint_in.start_date
    if sprint_in.end_date is not None: db_sprint.end_date = sprint_in.end_date
    if sprint_in.status is not None: db_sprint.status = sprint_in.status
    if sprint_in.goal is not None: db_sprint.goal = sprint_in.goal
    
    db.commit()
    db.refresh(db_sprint)
    return db_sprint

@app.get("/api/tickets/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: int, db = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    db_ticket = db.query(TicketDB).filter(TicketDB.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if current_user.profile.name == "Solicitante" and db_ticket.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this ticket")
        
    return db_ticket

@app.post("/api/tickets/{ticket_id}/interactions", response_model=InteractionResponse, tags=["Tickets"])
def add_ticket_interaction(ticket_id: int, interaction: InteractionCreate, db = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    db_ticket = db.query(TicketDB).filter(TicketDB.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if current_user.profile.name == "Solicitante" and db_ticket.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to comment on this ticket")
        
    db_interaction = TicketInteractionDB(
        ticket_id=ticket_id,
        author_id=current_user.id,
        content=interaction.content
    )
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)
    return db_interaction

@app.get("/api/tickets/{ticket_id}/interactions", response_model=list[InteractionResponse], tags=["Tickets"])
def get_ticket_interactions(ticket_id: int, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    db_ticket = db.query(TicketDB).filter(TicketDB.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if current_user.profile.name == "Solicitante" and db_ticket.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view interactions for this ticket")
        
    return db_ticket.interactions

@app.get("/api/types", response_model=list[TicketTypeResponse], tags=["Tickets"])
def get_types(db: Session = Depends(get_db)):
    return db.query(TicketTypeDB).all()

@app.post("/api/categories", response_model=TicketCategoryResponse, tags=["Tickets"])
def create_category(category_in: TicketCategoryCreate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.profile.name != "Administrator":
        raise HTTPException(status_code=403, detail="Only Administrators can create new categories")
    
    existing_cat = db.query(TicketCategoryDB).filter(TicketCategoryDB.name == category_in.name).first()
    if existing_cat:
        raise HTTPException(status_code=400, detail="Category name already exists")
        
    db_cat = TicketCategoryDB(name=category_in.name)
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@app.post("/api/types", response_model=TicketTypeResponse, tags=["Tickets"])
def create_type(type_in: TicketTypeCreate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.profile.name != "Administrator":
        raise HTTPException(status_code=403, detail="Only Administrators can create new types")
        
    cat = db.query(TicketCategoryDB).filter(TicketCategoryDB.id == type_in.category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    db_type = TicketTypeDB(name=type_in.name, category_id=type_in.category_id)
    db.add(db_type)
    db.commit()
    db.refresh(db_type)
    return db_type

# --- Reports Endpoints ---
@app.get("/api/reports/kpis", tags=["Reports"])
def get_report_kpis(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.profile.name == "Solicitante":
        raise HTTPException(status_code=403, detail="Not authorized to view reports")
    # Real metrics computation
    total_tickets = db.query(TicketDB).count()
    concluido_status = db.query(StatusDB).filter(StatusDB.name == "Concluido").first()
    
    avg_minutes = 0
    satisfaction = 100 # Default if no data
    
    if concluido_status:
        resolved_tickets = db.query(TicketDB).filter(TicketDB.status_id == concluido_status.id).all()
        if resolved_tickets:
            total_minutes = 0
            on_time_count = 0
            
            for t in resolved_tickets:
                # Find last interaction
                last_interaction = db.query(TicketInteractionDB).filter(TicketInteractionDB.ticket_id == t.id).order_by(TicketInteractionDB.created_at.desc()).first()
                start_time = t.created_at
                end_time = last_interaction.created_at if last_interaction else start_time
                
                minutes = (end_time - start_time).total_seconds() / 60.0
                total_minutes += minutes
                
                # Assume satisfaction is 100% if resolved within 24 hours (1440 min)
                if minutes <= 1440:
                    on_time_count += 1
            
            avg_minutes = int(total_minutes / len(resolved_tickets))
            satisfaction = int((on_time_count / len(resolved_tickets)) * 100)

    return {
        "total_tickets": total_tickets,
        "avg_minutes": avg_minutes,
        "satisfaction": satisfaction
    }

@app.get("/api/reports/volume", tags=["Reports"])
def get_report_volume(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.profile.name == "Solicitante":
        raise HTTPException(status_code=403, detail="Not authorized to view reports")
    
    # Real database volume (grouped by month)
    tickets = db.query(TicketDB.created_at).all()
    
    import datetime
    
    month_counts = {}
    for t in tickets:
        # Avoid None if older tickets don't have created_at
        dt = t[0] or datetime.datetime.now()
        month_str = dt.strftime("%b %Y") # e.g. "Mar 2026"
        month_counts[month_str] = month_counts.get(month_str, 0) + 1
        
    # Get last 7 months labels to ensure we always show a line chart
    result = []
    today = datetime.datetime.now()
    for i in range(6, -1, -1):
        target_month = (today.month - 1 - i) % 12 + 1
        target_year = today.year + ((today.month - 1 - i) // 12)
        # Handle locale issues by explicitly mapping to pt-BR if preferred, but basic strftime is fine
        # Let's use simple indexing for pt-BR abbreviations
        pt_months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
        month_label = pt_months[target_month - 1]
        
        # We try to match with the dict using english format or manually check
        # For precision, let's just construct the key manually identical to strftime
        eng_months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        key = f"{eng_months[target_month - 1]} {target_year}"
        
        count = month_counts.get(key, 0)
        # Add dummy data just so the chart doesn't look completely flat on new installs, 
        # but keep real count if > 0.
        # Actually, let's use the real count. If 0, it's 0.
        result.append({"month": month_label, "count": count})
        
    # If the database is completely empty, it will just show zeroes
    return result

@app.get("/api/reports/operators", tags=["Reports"])
def get_report_operators(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.profile.name == "Solicitante":
        raise HTTPException(status_code=403, detail="Not authorized to view reports")
        
    # Real ranking based on how many interactions they made (since there's no assigned_to field)
    from sqlalchemy import func
    operator_counts = db.query(
        UserDB.full_name, 
        func.count(TicketInteractionDB.id).label("total")
    ).join(TicketInteractionDB, UserDB.id == TicketInteractionDB.author_id)\
     .join(ProfileDB, UserDB.profile_id == ProfileDB.id)\
     .filter(ProfileDB.name.in_(["Operador", "Administrator"]))\
     .group_by(UserDB.id)\
     .order_by(func.count(TicketInteractionDB.id).desc())\
     .limit(5)\
     .all()
     
    if not operator_counts:
        # Fallback empty list
        return []
        
    max_count = max([c[1] for c in operator_counts])
    
    result = []
    for op in operator_counts:
        percentage = int((op[1] / max_count) * 100) if max_count > 0 else 0
        name_display = op[0] or "Operador"
        result.append({
            "name": name_display.split()[0], # First name
            "count": op[1],
            "percentage": percentage
        })
        
    return result

@app.get("/api/reports/categories", tags=["Reports"])
def get_report_categories(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    if current_user.profile.name == "Solicitante":
        raise HTTPException(status_code=403, detail="Not authorized to view reports")
    
    cats = db.query(TicketCategoryDB).all()
    res = []
    for c in cats:
        count = db.query(TicketDB).join(TicketTypeDB).filter(TicketTypeDB.category_id == c.id).count()
        if count > 0:
             res.append({"name": c.name, "count": count})
    if not res:
        # Fallback simulated data if empty
        res = [
            {"name": "Sem Categoria Definida", "count": db.query(TicketDB).count()}
        ]
    return res
