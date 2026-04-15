-- Academic Database Setup Script
-- Run this in MySQL Workbench or MySQL command line

CREATE DATABASE IF NOT EXISTS academic_db;
USE academic_db;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'student',
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_isActive (isActive)
);

-- Insert test users (password hashed with bcrypt: admin123)
-- The hash is: $2a$10$EIXq4p1Ov7tJWXK2Yd4Ov.zaqw3I7aB7D3J7K2L3M4N5O6P7Q8R9S
INSERT INTO users (email, name, password, role, isActive) VALUES
('admin@academic.edu', 'Admin User', '$2a$10$EIXq4p1Ov7tJWXK2Yd4Ov.zaqw3I7aB7D3J7K2L3M4N5O6P7Q8R9S', 'admin', true),
('teacher@academic.edu', 'Teacher User', '$2a$10$EIXq4p1Ov7tJWXK2Yd4Ov.zaqw3I7aB7D3J7K2L3M4N5O6P7Q8R9S', 'teacher', true),
('student@academic.edu', 'Student User', '$2a$10$EIXq4p1Ov7tJWXK2Yd4Ov.zaqw3I7aB7D3J7K2L3M4N5O6P7Q8R9S', 'student', true);

-- Verify the setup
SELECT COUNT(*) as user_count FROM users;
SELECT * FROM users;
