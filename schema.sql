-- Academic Module Database Schema
-- MySQL setup for integration testing and production use

CREATE DATABASE IF NOT EXISTS academic_db;
USE academic_db;

-- Users table with authentication fields
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

-- Academic sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  isActive BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_isActive (isActive)
);

-- Semesters table (scoped to a session)
CREATE TABLE IF NOT EXISTS academic_module_semesters (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  sessionId VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sessionId (sessionId),
  INDEX idx_name (name)
);

-- Classes table
CREATE TABLE IF NOT EXISTS academic_module_classes (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  academicYear VARCHAR(20) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_academicYear (academicYear),
  INDEX idx_name (name)
);

-- Faculties table (predefined academic structure)
CREATE TABLE IF NOT EXISTS academic_module_faculties (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  facultyId VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  department VARCHAR(150) NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_facultyId (facultyId),
  INDEX idx_name (name),
  INDEX idx_department (department)
);

-- Courses table (global course catalog)
CREATE TABLE IF NOT EXISTS academic_module_courses (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  code VARCHAR(30) NULL,
  credits DECIMAL(4,2) NULL,
  faculty VARCHAR(100) NULL,
  department VARCHAR(100) NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_name (name),
  INDEX idx_code (code),
  INDEX idx_department (department)
);

-- Exam types table (configurable)
CREATE TABLE IF NOT EXISTS academic_module_exam_types (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(30) NOT NULL,
  weight DECIMAL(6,2) NOT NULL DEFAULT 0,
  description TEXT NULL,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_code (code),
  INDEX idx_isActive (isActive),
  INDEX idx_name (name)
);

-- Exam results table
CREATE TABLE IF NOT EXISTS academic_module_exam_results (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  studentId VARCHAR(36) NOT NULL,
  courseId VARCHAR(36) NOT NULL,
  examTypeId VARCHAR(36) NOT NULL,
  sessionId VARCHAR(36) NOT NULL,
  semesterId VARCHAR(36) NOT NULL,
  score DECIMAL(10,2) NOT NULL,
  maxScore DECIMAL(10,2) NOT NULL,
  percentage DECIMAL(6,2) NOT NULL,
  gradePoint DECIMAL(4,2) NOT NULL,
  letterGrade VARCHAR(3) NOT NULL,
  comments TEXT NULL,
  isPublished BOOLEAN NOT NULL DEFAULT FALSE,
  enteredBy VARCHAR(255) NOT NULL,
  enteredAt DATETIME NOT NULL,
  modifiedBy VARCHAR(255) NULL,
  modifiedAt DATETIME NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_studentId (studentId),
  INDEX idx_courseId (courseId),
  INDEX idx_examTypeId (examTypeId),
  INDEX idx_session_semester (sessionId, semesterId),
  INDEX idx_isPublished (isPublished),
  INDEX idx_enteredAt (enteredAt)
);

-- Class-course offerings (which courses are taught in which class)
CREATE TABLE IF NOT EXISTS academic_module_class_courses (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  classId VARCHAR(36) NOT NULL,
  courseId VARCHAR(36) NOT NULL,
  credits INT NULL,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_class_course (classId, courseId),
  INDEX idx_classId (classId),
  INDEX idx_courseId (courseId),
  INDEX idx_isActive (isActive)
);

-- Sections table (belongs to a class)
CREATE TABLE IF NOT EXISTS academic_module_sections (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  classId VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  roomNumber VARCHAR(50) NOT NULL,
  capacity INT NOT NULL DEFAULT 30,
  currentStudents INT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_class_section (classId, name),
  INDEX idx_classId (classId)
);

-- Syllabi table (file metadata, linked to class + course)
CREATE TABLE IF NOT EXISTS academic_module_syllabi (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  faculty VARCHAR(255) NOT NULL DEFAULT '',
  classId VARCHAR(36) NOT NULL,
  courseId VARCHAR(36) NOT NULL,
  fileName VARCHAR(255) NOT NULL,
  fileUrl TEXT NOT NULL,
  fileSize BIGINT NOT NULL,
  fileType VARCHAR(150) NOT NULL,
  fileData LONGBLOB NULL,
  uploadedBy VARCHAR(255) NOT NULL,
  uploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_classId (classId),
  INDEX idx_courseId (courseId),
  INDEX idx_uploadedAt (uploadedAt),
  INDEX idx_name (name)
);

-- Settings table (stores academic-module config)
CREATE TABLE IF NOT EXISTS academic_module_settings (
  settingKey VARCHAR(100) PRIMARY KEY,
  settingValue VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Course teacher assignments (1 teacher per course)
CREATE TABLE IF NOT EXISTS academic_module_course_teacher_assignments (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  courseId VARCHAR(36) NOT NULL,
  teacherId VARCHAR(36) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_course (courseId),
  INDEX idx_teacherId (teacherId)
);

-- Teachers table
CREATE TABLE IF NOT EXISTS academic_module_teachers (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  gender VARCHAR(20) NOT NULL,
  nationality VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  address2 VARCHAR(255) NULL,
  city VARCHAR(100) NOT NULL,
  zip VARCHAR(20) NOT NULL,
  photo MEDIUMTEXT NULL,
  subjects TEXT NULL,
  qualifications TEXT NULL,
  experience VARCHAR(50) NULL,
  joiningDate DATE NULL,
  salary DECIMAL(12,2) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_email (email),
  INDEX idx_status (status),
  INDEX idx_name (lastName, firstName)
);

-- Students table
CREATE TABLE IF NOT EXISTS academic_module_students (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  sequence BIGINT NOT NULL AUTO_INCREMENT UNIQUE,

  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  passwordHash VARCHAR(255) NULL,
  birthday DATE NULL,

  phone VARCHAR(50) NOT NULL,
  className VARCHAR(100) NOT NULL,
  sectionName VARCHAR(100) NOT NULL,
  gender VARCHAR(20) NOT NULL,

  bloodType VARCHAR(10) NOT NULL,
  nationality VARCHAR(100) NOT NULL,
  religion VARCHAR(50) NOT NULL,

  address VARCHAR(255) NOT NULL,
  address2 VARCHAR(255) NULL,
  city VARCHAR(100) NOT NULL,
  zip VARCHAR(20) NOT NULL,

  idCardNumber VARCHAR(50) NULL,
  boardRegistrationNo VARCHAR(50) NULL,

  fatherName VARCHAR(100) NOT NULL,
  motherName VARCHAR(100) NOT NULL,
  fatherPhone VARCHAR(50) NOT NULL,
  motherPhone VARCHAR(50) NOT NULL,
  fatherOccupation VARCHAR(100) NULL,
  motherOccupation VARCHAR(100) NULL,
  fatherEmail VARCHAR(255) NULL,
  motherEmail VARCHAR(255) NULL,

  emergencyContact VARCHAR(50) NOT NULL,
  medicalConditions TEXT NULL,
  allergies TEXT NULL,
  previousSchool VARCHAR(255) NULL,
  transferReason TEXT NULL,

  studentId VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  enrollmentDate DATE NOT NULL DEFAULT (CURRENT_DATE),
  photo MEDIUMTEXT NULL,

  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_email (email),
  UNIQUE KEY uniq_studentId (studentId),
  UNIQUE KEY uniq_idCardNumber (idCardNumber),
  INDEX idx_status (status),
  INDEX idx_class_section (className, sectionName),
  INDEX idx_name (lastName, firstName)
);

-- Notices table
CREATE TABLE IF NOT EXISTS academic_module_notices (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(20) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'published',
  target TEXT NOT NULL,
  publishDate DATETIME NOT NULL,
  expiryDate DATETIME NULL,
  createdById VARCHAR(36) NOT NULL,
  createdByName VARCHAR(255) NOT NULL,
  createdByRole VARCHAR(255) NOT NULL,
  attachments LONGTEXT NULL,
  views INT NOT NULL DEFAULT 0,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  INDEX idx_type (type),
  INDEX idx_publishDate (publishDate),
  INDEX idx_pinned (pinned),
  INDEX idx_createdById (createdById)
);

-- Attendance sessions table
CREATE TABLE IF NOT EXISTS academic_module_attendance_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  courseId VARCHAR(36) NOT NULL,
  classId VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  takenBy VARCHAR(255) NOT NULL,
  takenAt DATETIME NOT NULL,
  notes TEXT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_session (courseId, classId, date),
  INDEX idx_courseId (courseId),
  INDEX idx_classId (classId),
  INDEX idx_date (date)
);

-- Attendance records table
CREATE TABLE IF NOT EXISTS academic_module_attendance_records (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  sessionId VARCHAR(36) NOT NULL,
  studentId VARCHAR(36) NOT NULL,
  status VARCHAR(10) NOT NULL,
  notes TEXT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_record (sessionId, studentId),
  INDEX idx_sessionId (sessionId),
  INDEX idx_studentId (studentId),
  INDEX idx_status (status)
);

-- Members table (self registration)
CREATE TABLE IF NOT EXISTS academic_module_members (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  sequence BIGINT NOT NULL AUTO_INCREMENT UNIQUE,

  fullName VARCHAR(255) NOT NULL,
  mobileNumber VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  deggen VARCHAR(255) NOT NULL,
  shaqada VARCHAR(150) NOT NULL,
  masuulkaaga VARCHAR(255) NOT NULL,

  photo MEDIUMTEXT NULL,

  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_member_email (email),
  INDEX idx_member_mobile (mobileNumber),
  INDEX idx_member_fullName (fullName),
  INDEX idx_member_createdAt (createdAt)
);

-- Donations table
CREATE TABLE IF NOT EXISTS academic_module_donations (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  amount DECIMAL(12,2) NOT NULL,
  donorName VARCHAR(255) NULL,
  mobileNumber VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  note TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PLEDGED',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_donation_createdAt (createdAt),
  INDEX idx_donation_status (status)
);

-- Verify table creation
DESCRIBE users;
SELECT COUNT(*) as user_count FROM users;

DESCRIBE sessions;
SELECT COUNT(*) as session_count FROM sessions;

DESCRIBE academic_module_semesters;
SELECT COUNT(*) as semester_count FROM academic_module_semesters;

DESCRIBE academic_module_classes;
SELECT COUNT(*) as class_count FROM academic_module_classes;

DESCRIBE academic_module_courses;
SELECT COUNT(*) as course_count FROM academic_module_courses;

DESCRIBE academic_module_sections;
SELECT COUNT(*) as section_count FROM academic_module_sections;

DESCRIBE academic_module_syllabi;
SELECT COUNT(*) as syllabi_count FROM academic_module_syllabi;

DESCRIBE academic_module_settings;
SELECT COUNT(*) as settings_count FROM academic_module_settings;

DESCRIBE academic_module_course_teacher_assignments;
SELECT COUNT(*) as course_teacher_assignment_count FROM academic_module_course_teacher_assignments;

DESCRIBE academic_module_teachers;
SELECT COUNT(*) as teacher_count FROM academic_module_teachers;

DESCRIBE academic_module_students;
SELECT COUNT(*) as student_count FROM academic_module_students;

DESCRIBE academic_module_members;
SELECT COUNT(*) as member_count FROM academic_module_members;

DESCRIBE academic_module_donations;
SELECT COUNT(*) as donation_count FROM academic_module_donations;

DESCRIBE academic_module_notices;
SELECT COUNT(*) as notice_count FROM academic_module_notices;
