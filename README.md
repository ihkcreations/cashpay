## Contributors
| Name                                 | Student ID            | 
| ------------------                   | ----------            |
| Md. Iftekhar Hossain Khan            | 2020-3-60-073         |
| Arun Jyoti Mondal                    | 2020-3-60-064         |
| Md. Sakibur Rahman                   | 2021-3-60-057         |
| Md. Tanvir Hasan Misu                | 2020-2-60-204         |


# **About Cashpay Repository:**  <br>
This repository contains the source code for CashPay, a prototype mobile financial service application developed using the MERN stack (MongoDB, Express.js, React, Node.js). It simulates core functionalities found in services like Bkash, including user accounts, agent operations, merchant payments, and a comprehensive admin panel for system management. This project was created for a university-level software development course (CSE412, Software Engineering, East West University).

## **Live Application Links:**
*   **User:** [CashPay](https://cashpay-six.vercel.app/)
*   **Agent:** [CashPay Agent](https://cashpay-six.vercel.app/agent)
*   **Admin Panel:** [CashPay Agent](https://cashpay-six.vercel.app/admin/login)

---

## Table of Contents
1.  [Overview](#1-overview)
2.  [Key Features](#2-key-features)
3.  [Technology Stack](#3-technology-stack)
4.  [System Architecture (Brief)](#4-system-architecture-brief)
5.  [Setup and Installation (Local Development)](#5-setup-and-installation-local-development)
6.  [Running the Application](#6-running-the-application)
7.  [API Endpoints (Overview)](#7-api-endpoints-overview)
8.  [Deployment](#8-deployment)
9.  [Future Enhancements](#9-future-enhancements)
10. [Author(s)](#10-authors)

---

## 1. Overview

CashPay aims to replicate essential mobile financial services, providing distinct interfaces and functionalities for regular users, financial agents, and system administrators. The application supports common transactions like sending money, adding funds, paying bills, mobile recharge, cash-in/cash-out via agents, and payments to merchants. It also includes an administrative backend for oversight and management of the platform's entities and activities, including new experimental features like user loan requests and investments.

## 2. Key Features

### User Module
*   Secure multi-step registration with OTP verification.
*   Two-phase login (Mobile & PIN).
*   User Dashboard: Balance view, transaction shortcuts.
*   **Transactions:** Add Money, Send Money (to Users/Agents), Merchant Payment, Cash Out (via Agents), Mobile Recharge, Pay Bill.
*   View detailed Transaction Statement with pagination.
*   Profile Completion (Name, DOB).
*   Request Loans & View Status.
*   Make Investments & View Status.

### Agent Module
*   Separate multi-step agent application process with OTP verification and mandatory Admin approval.
*   Secure Agent Login (post-approval PIN setup).
*   Agent Dashboard: Balance view, operational shortcuts.
*   **Operations:** Process Cash In for users, Process User Cash Out, Agent-to-User/Agent Send Money, Pay Bills for users.
*   Agent-specific Transaction Statement.

### Admin Panel
*   Role-based access (Admin, Super Admin).
*   Secure Admin Login (username/password).
*   Application process for new Admins, approved by Super Admin (OTP based).
*   Password Reset functionality for Admins.
*   **Comprehensive Dashboard:**
    *   Real-time statistics: Total Users, Active Agents, Merchants, Admins.
    *   Aggregated transaction summaries.
    *   Recent system activities.
    *   (Placeholder for Loan/Investment summaries).
*   **Entity Management:**
    *   **Users:** List, search, view details, add new users (by Super Admin), delete users.
    *   **Agents:** List (filterable by application status), view details, approve/reject applications, activate/deactivate, add new agents (by Super Admin), delete agents.
    *   **Merchants:** List, search, view details, add new merchants, activate/deactivate, delete.
    *   **Admins:** List, view details, approve/reject applications for new admins, activate/deactivate, reset passwords for other admins (by Super Admin), add new admins (by Super Admin).
*   **Transactions Overview:** View all system transactions with details, pagination, and an option for Super Admin to clear all history.
*   **Loan Management:** View loan requests, approve/reject, mark as disbursed.
*   **Investment Management:** View investments, process payouts/mark as matured.

## 3. Technology Stack

*   **Frontend:** React (with React Router, Axios, Context API for state management)
*   **Backend:** Node.js, Express.js
*   **Database:** MongoDB (with Mongoose ODM)
*   **Authentication:** JWT (JSON Web Tokens), bcryptjs for hashing
*   **Styling:** Plain CSS with modular structure (`index.css`, `Agent.css`, `Admin.css`)
*   **Development Tools:** Nodemon, ESLint

## 4. System Architecture (Brief)

The application follows a standard MERN architecture:
*   **React Frontend:** Handles user interface and interaction, making API calls to the backend. Separate UI themes and layouts for User, Agent, and Admin sections.
*   **Node.js/Express Backend:** Provides a RESTful API for all application logic, including authentication, transaction processing, and data management.
*   **MongoDB Database:** Stores all persistent data for users, agents, admins, merchants, transactions, OTPs, loans, and investments. Uses Mongoose for object data modeling.

## 5. Setup and Installation (Local Development)

**Prerequisites:**
*   Node.js (LTS version, e.g., v18+)
*   npm (v8+) or yarn (v1.22+)
*   MongoDB installed locally or a MongoDB Atlas account.
---
**Backend Setup (server directory):**
1. cd server
2. npm install (or yarn install)
3. Create a .env file based on .env.example (if provided) or use the following structure:

```bash
PORT=5000
MONGO_URI=YOUR_MONGODB_CONNECTION_STRING_HERE  # e.g., mongodb://localhost:27017/cashpay_dev OR your Atlas SRV string
JWT_SECRET=CHOOSE_A_VERY_STRONG_RANDOM_SECRET
# Super Admin Credentials for initial setup (used by script)
SUPER_ADMIN_USERNAME=super_admin
SUPER_ADMIN_PASSWORD=MakeThisVerySecure123!
SUPER_ADMIN_NAME=Platform Super Administrator
# OTP for admin self-application prototype (from UI screenshot)
ADMIN_APP_OTP=25684238
```

```
For local MongoDB supporting transactions:
Ensure it's running as a replica set (e.g., start mongod --replSet rs0 --dbpath /path/to/data, then in mongosh run rs.initiate()). Your MONGO_URI should then include ?replicaSet=rs0.
```
4. Run the script to create the initial Super Admin: ```node scripts/createSuperAdmin.js```


**Frontend Setup (client directory):**
1. cd client
2. npm install (or yarn install)
3. Create a .env file with your backend API URL: ```REACT_APP_API_URL=http://localhost:5000/api ```
---

## 6. Running the Application
1. Start the Backend Server:
```From the server directory: npm run server (for development with nodemon)```
2.Start the Frontend Development Server:
```From the client directory: npm start```
The User/Agent app will be accessible at http://localhost:3000. <br>
The Admin panel will be accessible at http://localhost:3000/admin/login. <br>

## 7. API Endpoints (Overview)
```
/api/auth/... (User login, registration, profile)
/api/auth/agent/login (Agent login) 
/api/agent/... (Agent application, OTP, PIN set, operations)
/api/admin/auth/... (Admin login, application, password reset)
/api/admin/data/... (Admin data management for users, agents, merchants, admins, transactions, loans, investments, stats)
/api/transactions/... (User-initiated financial transactions)
/api/merchants/ (List merchants for users)
/api/loans/ (User loan actions)
/api/investments/ (User investment actions)
```

## 8. Deployment
The application is designed for deployment with:
* **Frontend (React):** ```Vercel```
* **Backend (Node.js/Express):** ```Render```
* **Database (MongoDB):** ```MongoDB Atlas```
* Environment variables specific to production (e.g., production MONGO_URI, different REACT_APP_API_URL pointing to the deployed backend) need to be configured on the respective hosting platforms.

## 9. Future Enhancements
* Real OTP integration via SMS gateway.
* QR Code payments.
* More detailed transaction types and fee structures.
* Advanced reporting and analytics for Admin.
* Two-Factor Authentication.
* Full implementation of Loan/Investment lifecycle (e.g., interest calculation, automated payouts).
* User notifications system.

## 10. Author(s)
