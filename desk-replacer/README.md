# Desk API Replacement App

Bem-vindo ao **Desk API Replacement**! Este é um sistema moderno de Help Desk (Central de Atendimentos) e Kanban desenvolvido com **FastAPI** (Python backend) e **Vanilla JS + Tailwind CSS** (Frontend).

O objetivo principal deste sistema é fornecer uma interface de gestão de tickets rápida, robusta, e totalmente documentada para integrações externas (via chaves de API).

## 🚀 Arquitetura Geral

O projeto é construído em uma arquitetura estilo SPA (Single Page Application) simples. Todo o roteamento de páginas e lógicas de visualização acontecem estaticamente pelo navegador, enquanto os dados são trafegados via REST API para o backend.

### Backend (Python + FastAPI)
- **Arquivo Principal:** `main.py` é o coração do sistema. Ele define a configuração do banco de dados, os modelos de tabelas (ORM), a autenticação JWT/API-KEY, e todas as rotas da API (`/api/...`).
- **Banco de Dados:** Utiliza PostgreSQL via **SQLAlchemy**. O banco é instanciado na string `DATABASE_URL`.
- **Rotas e Lógica:** O código está organizado de forma sequencial no `main.py`. Ao longo do arquivo, você encontra a definição dos modelos (como `TicketDB`, `UserDB`, etc.), seguido pelas estruturas Pydantic para validação de payload, e finalmente os decorators (`@app.get`, `@app.post`) que representam os Action Controllers.

### Frontend (HTML + JS + Tailwind CSS)
O frontend fica na pasta estática (`/static`). 
- **Tailwind:** Nós estamos injetando o Tailwind CSS através do CDN em tempo real com o arquivo `index.css` fornecendo algumas variáveis mestre.
- **Páginas HTML:** Cada página possui sua estrutura independente (ex: `dashboard.html`, `users.html`, `reports.html`). O roteamento do Frontend é mapeado através do backend no final do `main.py` utilizando o FastAPI `FileResponse`.
- **Javascript (`app.js` e outros):**
  - O arquivo `app.js` governa a animação global de transição entra páginas, a verificação de token de acesso e as lógicas de Kanban (Drag and drop dos tickets).
  - Outros scripts menores cuidam de suas próprias páginas. Exemplo: `reports.js` desenha os gráficos em SVG no Dashboard de Relatórios a partir dos dados do backend.

---

## 📂 Estrutura de Diretórios (Onde encontrar cada coisa)

- `main.py`: É a aplicação inteira no backend. Você encontra os modelos de banco aqui.
- `static/`
  - `index.css`: Definições globais e barra de rolagem customizada.
  - `app.js`: Lógica global de permissões, Kanban, arrastar/soltar e transições.
  - `dashboard.html`: Tela principal dos administradores/operadores.
  - `users.html` / `users.js`: Listagem, criação e gerenciamento de perfis de usuário.
  - `reports.html` / `report_dashboard.html` / `reports.js`: O incrível módulo de produtividade e KPI analítico, que consulta volume, tempo de resposta e operadores.
  - `profile.html` / `profile.js`: Tela de ajustes da conta do próprio usuário.
  - `api_management.html` / `api_docs.html` / `api_management.js`: Tela super avançada onde sistemas externos ou adms podem gerar `X-API-KEY` tokens e inspecionar os Manuais das APIs de tickets.
  - `categories.html` / `types.html`: Gestão das classificações para as tabelas auxiliares.

---

## 🔐 Autenticação e Perfis (RBAC)

O sistema possui Roles de usuários (Perfis) definidos no início (seed data):
1. **Administrator:** Acesso total a configurações, usuários, geração de tokens, relatórios e permissão de excluir APIs.
2. **Operador:** Visualização de Kanban, movimentação de tickets (drag and drop), atualização e interação nos comentários.
3. **Solicitante:** Apenas abre novos tickets e comenta neles. Visualiza APENAS seus próprios chamados.

Existem duas formas de comunicar o frontend/scripts externos com o servidor:
1. **Bearer Token (JWT):** Utilizado pelo navegador após o login. Salvo no `localStorage` sob a chave `access_token`.
2. **X-API-KEY (Header):** Criada pelos Administradores na aba "Gestão de APIs". Caso você esteja construindo um Webhook no N8N, Zapier ou em um CLI local, passe um header `X-API-KEY: seu_hash_de_api` na requisição ao invés do Bearer Token. As permissões obedecem aos critérios do criador da Key!

---

## 🖧 Tabela de Endpoints Dinâmicos Rest API

Tudo no sistema é feito com a API.
*   **Autenticar:** `POST /api/auth/login`
*   **Gestão de Chamados:** `GET /api/tickets`, `POST /api/tickets`, `PATCH /api/tickets/{id}`
*   **Interações/Comentários:** `GET /api/tickets/{id}/interactions`, `POST /api/tickets/{id}/interactions`
*   **Cadastros Globais:** `GET /api/users`, `POST /api/users`
*   **Suporte:** `GET /api/categories`, `GET /api/types`, `GET /api/statuses`
*   **Relatórios (Dashboards Reais):** `GET /api/reports/kpis`, `GET /api/reports/volume`, `GET /api/reports/operators`, `GET /api/reports/categories`

> 💡 Se você rodar o projeto localmente, acesse `http://localhost:8080/docs` para visualizar o Swagger UI e testar as requisições em uma plataforma amigável do próprio FastAPI. A Documentação também é acessível no menu inferior `Gestão API -> Documentação`.

---

## 🛠️ Como rodar Localmente (Deploy para Crianças)

Para testar no seu computador as alterações mais recentes, basta seguir um caminho mágico e simples:

1. **Instale o Python:** Você precisa do Python 3.10 ou superior rodando em sua máquina.
2. **Instale as Bibliotecas:** No terminal raiz, rode:
    ```bash
    pip install "fastapi[all]" sqlalchemy bcrypt "python-jose[cryptography]" gunicorn
    ```
    *(ou instale usando seu `requirements.txt` com `pip install -r requirements.txt` se preferir)*

3. **Inicie o Servidor Backend Mágico:**
    Execute no seu terminal:
    ```bash
    python -m uvicorn main:app --reload --port 8080
    ```
4. **Pronto!** Vá no seu navegador preferido e clique no link abaixo:
    👉 `http://localhost:8080`

Para logar na base de testes pela primeira vez:
- **E-mail/Username:** `admin`
- **Senha:** `admin`
