# 📝 Todo App - PostgreSQL BREAD Operations

## 📖 Description
A Todo List web application with authentication system using Express.js and PostgreSQL. Implements BREAD operations (Browse, Read, Edit, Add, Delete) with pagination and avatar upload features.

## 🛠️ Technology Stack
- **Backend**: Express.js, PostgreSQL
- **Frontend**: EJS, Bootstrap 5, Bootstrap Icons
- **Middleware**: Express Session, Express File Upload, Connect Flash
- **Tools**: Moment.js, bcrypt

## ⭐ Main Features

### 🔐 Authentication
- Register & Login with password hashing
- Session management
- 🏠 Logout

### 📋 Todo Management (BREAD)
- 📄 **Browse**: List todos with pagination (5 items/page)
- 👁️ **Read**: View todo details
- ✏️ **Edit**: Update todo (title, deadline, status)
- ➕ **Add**: Create new todo
- 🗑️ **Delete**: Remove todo

### 🔍 Filter & Sort
- 🔍 Filter by title, date, and status
- 📊 Sort by deadline, title, complete, id
- ⚙️ AND/OR operators for filter combinations

### 👤 User Profile
- 🖼️ Upload avatar with preview
- 📝 Update profile