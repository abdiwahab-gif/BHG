#!/usr/bin/env node
/**
 * Database Setup Script
 * Runs: npm run setup-db
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
  let connection;

  try {
    console.log('🔄 Connecting to MySQL...');
    
    // First connection to create database
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '4593697',
    });

    console.log('✅ Connected to MySQL!');

    // Create database using query for DDL commands
    console.log('📦 Creating database...');
    await connection.query('CREATE DATABASE IF NOT EXISTS academic_db');
    console.log('✅ Database created!');

    // Select database using query instead of execute for DDL
    await connection.query('USE academic_db');

    // Disable foreign key constraints temporarily
    console.log('🔒 Disabling foreign key constraints...');
    await connection.query('SET FOREIGN_KEY_CHECKS=0');

    // Drop existing users table if it exists
    console.log('🗑️  Dropping old users table if exists...');
    await connection.query('DROP TABLE IF EXISTS users');
    console.log('✅ Old table removed!');

    // Re-enable foreign key constraints
    await connection.query('SET FOREIGN_KEY_CHECKS=1');
    console.log('🔓 Foreign key constraints re-enabled!');

    // Create users table
    console.log('📋 Creating users table...');
    const createTableSQL = `
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
      )
    `;
    await connection.query(createTableSQL);
    console.log('✅ Users table created!');

    // Create sessions table
    console.log('📋 Creating sessions table...');
    const createSessionsSQL = `
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(100) NOT NULL,
        startDate DATE NOT NULL,
        endDate DATE NOT NULL,
        isActive BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_isActive (isActive)
      )
    `;
    await connection.query(createSessionsSQL);
    console.log('✅ Sessions table created!');

    // Create semesters table
    console.log('📋 Creating semesters table...');
    const createSemestersSQL = `
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
      )
    `;
    await connection.query(createSemestersSQL);
    console.log('✅ Semesters table created!');

    // Create classes table
    console.log('📋 Creating classes table...');
    const createClassesSQL = `
      CREATE TABLE IF NOT EXISTS academic_module_classes (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(100) NOT NULL,
        description TEXT NULL,
        academicYear VARCHAR(20) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_academicYear (academicYear),
        INDEX idx_name (name)
      )
    `;
    await connection.query(createClassesSQL);
    console.log('✅ Classes table created!');

    // Create faculties table
    console.log('📋 Creating faculties table...');
    const createFacultiesSQL = `
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
      )
    `;
    await connection.query(createFacultiesSQL);
    console.log('✅ Faculties table created!');

    // Create courses table
    console.log('📋 Creating courses table...');
    const createCoursesSQL = `
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
      )
    `;
    await connection.query(createCoursesSQL);
    console.log('✅ Courses table created!');

    // Create exam types table
    console.log('📋 Creating exam types table...');
    const createExamTypesSQL = `
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
      )
    `;
    await connection.query(createExamTypesSQL);
    console.log('✅ Exam types table created!');

    // Create exam results table
    console.log('📋 Creating exam results table...');
    const createExamResultsSQL = `
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
      )
    `;
    await connection.query(createExamResultsSQL);
    console.log('✅ Exam results table created!');

    // Create class-course offerings table
    console.log('📋 Creating class-course offerings table...');
    const createClassCoursesSQL = `
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
      )
    `;
    await connection.query(createClassCoursesSQL);
    console.log('✅ Class-course offerings table created!');

    // Create sections table
    console.log('📋 Creating sections table...');
    const createSectionsSQL = `
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
      )
    `;
    await connection.query(createSectionsSQL);
    console.log('✅ Sections table created!');

    // Create syllabi table
    console.log('📋 Creating syllabi table...');
    const createSyllabiSQL = `
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
      )
    `;
    await connection.query(createSyllabiSQL);
    console.log('✅ Syllabi table created!');

    // Create settings table
    console.log('📋 Creating settings table...');
    const createSettingsSQL = `
      CREATE TABLE IF NOT EXISTS academic_module_settings (
        settingKey VARCHAR(100) PRIMARY KEY,
        settingValue VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await connection.query(createSettingsSQL);
    console.log('✅ Settings table created!');

    // Create course-teacher assignments table
    console.log('📋 Creating course-teacher assignments table...');
    const createAssignmentsSQL = `
      CREATE TABLE IF NOT EXISTS academic_module_course_teacher_assignments (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        courseId VARCHAR(36) NOT NULL,
        teacherId VARCHAR(36) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_course (courseId),
        INDEX idx_teacherId (teacherId)
      )
    `;
    await connection.query(createAssignmentsSQL);
    console.log('✅ Course-teacher assignments table created!');

    // Create teachers table
    console.log('📋 Creating teachers table...');
    const createTeachersSQL = `
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
      )
    `;
    await connection.query(createTeachersSQL);
    console.log('✅ Teachers table created!');

    // Create students table
    console.log('📋 Creating students table...');
    const createStudentsSQL = `
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
        INDEX idx_status (status),
        INDEX idx_class_section (className, sectionName),
        INDEX idx_name (lastName, firstName)
      )
    `;
    await connection.query(createStudentsSQL);
    console.log('✅ Students table created!');

    // Create notices table
    console.log('📋 Creating notices table...');
    const createNoticesSQL = `
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
      )
    `;
    await connection.query(createNoticesSQL);
    console.log('✅ Notices table created!');

    // Create attendance sessions table
    console.log('📋 Creating attendance sessions table...');
    const createAttendanceSessionsSQL = `
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
      )
    `;
    await connection.query(createAttendanceSessionsSQL);
    console.log('✅ Attendance sessions table created!');

    // Create attendance records table
    console.log('📋 Creating attendance records table...');
    const createAttendanceRecordsSQL = `
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
      )
    `;
    await connection.query(createAttendanceRecordsSQL);
    console.log('✅ Attendance records table created!');

    // Seed a default student so Student-dependent flows have data immediately
    console.log('🧑‍🎓 Seeding default student (if missing)...');
    const seedStudentSQL = `
      INSERT IGNORE INTO academic_module_students (
        id, firstName, lastName, email, phone, className, sectionName, gender,
        bloodType, nationality, religion, address, address2, city, zip,
        fatherName, motherName, fatherPhone, motherPhone,
        emergencyContact, medicalConditions, allergies, previousSchool, transferReason,
        studentId, status, photo
      ) VALUES (
        UUID(), ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, 'active', ?
      )
    `;
    await connection.execute(seedStudentSQL, [
      'John',
      'Doe',
      'john.doe@student.edu',
      '+1-555-0200',
      'Class 10',
      'Section A',
      'male',
      'A+',
      'American',
      'christianity',
      '456 Elm Street',
      'Unit 2',
      'New York',
      '10001',
      'Robert Doe',
      'Mary Doe',
      '+1-555-0201',
      '+1-555-0202',
      '+1-555-0203',
      'None',
      'None',
      'ABC High School',
      'N/A',
      '2024-10-A-001',
      '/diverse-students-studying.png',
    ]);
    console.log('✅ Default student seed complete!');

    // Seed a default teacher so Assign Teacher has data immediately
    console.log('👩‍🏫 Seeding default teacher (if missing)...');
    const seedTeacherSQL = `
      INSERT IGNORE INTO academic_module_teachers (
        id, firstName, lastName, email, phone, gender, nationality, address, address2, city, zip, photo,
        subjects, qualifications, experience, joiningDate, salary, status
      ) VALUES (
        UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active'
      )
    `;
    await connection.execute(seedTeacherSQL, [
      'John',
      'Smith',
      'john.smith@school.edu',
      '+1-555-0123',
      'Male',
      'American',
      '123 Main Street',
      'Apt 4B',
      'New York',
      '10001',
      '/professional-teacher-portrait.png',
      JSON.stringify(['Mathematics', 'Physics']),
      JSON.stringify(['M.Sc. Mathematics', 'B.Ed.']),
      '5 years',
      '2019-08-15',
      55000,
    ]);
    console.log('✅ Default teacher seed complete!');

    // Insert test users
    console.log('👥 Inserting test users...');
    
    // Generate bcrypt hash for password: admin123
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    const insertSQL = `
      INSERT INTO users (email, name, password, role, isActive) VALUES
      (?, ?, ?, ?, true),
      (?, ?, ?, ?, true),
      (?, ?, ?, ?, true)
    `;
    
    await connection.execute(insertSQL, [
      'admin@academic.edu', 'Admin User', passwordHash, 'admin',
      'teacher@academic.edu', 'Teacher User', passwordHash, 'teacher',
      'student@academic.edu', 'Student User', passwordHash, 'student'
    ]);
    console.log('✅ Test users inserted!');

    // Verify
    console.log('\n📊 Verifying setup...');
    const [users] = await connection.query('SELECT email, name, role FROM users');
    const [sessions] = await connection.query('SELECT id, name, startDate, endDate, isActive FROM sessions');
    const [semesters] = await connection.query('SELECT id, sessionId, name, startDate, endDate FROM academic_module_semesters');
    const [classes] = await connection.query('SELECT id, name, academicYear FROM academic_module_classes');
    const [courses] = await connection.query('SELECT id, name, type FROM academic_module_courses');
    const [sections] = await connection.query('SELECT id, classId, name, roomNumber, capacity, currentStudents FROM academic_module_sections');
    const [settings] = await connection.query('SELECT settingKey, settingValue, updatedAt FROM academic_module_settings');
    const [assignments] = await connection.query('SELECT courseId, teacherId, updatedAt FROM academic_module_course_teacher_assignments');
    const [teachers] = await connection.query('SELECT id, firstName, lastName, email, status FROM academic_module_teachers LIMIT 10');
    console.log('\n✅ Database Setup Complete!');
    console.log('\n📋 Test Users Created:');
    console.table(users);

    console.log('\n📋 Sessions:');
    console.table(sessions);

    console.log('\n📋 Semesters:');
    console.table(semesters);

    console.log('\n📋 Classes:');
    console.table(classes);

    console.log('\n📋 Courses:');
    console.table(courses);

    console.log('\n📋 Sections:');
    console.table(sections);

    console.log('\n📋 Settings:');
    console.table(settings);

    console.log('\n📋 Course-Teacher Assignments:');
    console.table(assignments);

    console.log('\n📋 Teachers:');
    console.table(teachers);

    console.log('\n🔐 Login Credentials:');
    console.log('  Email: admin@academic.edu');
    console.log('  Password: admin123');
    console.log('  (Same password for all test users)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('\n⚠️  MySQL Server is not running!');
      console.error('Please start MySQL and try again.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n⚠️  Wrong MySQL password!');
      console.error('Update the password in this script to match your MySQL root password.');
    } else if (error.code === 'ER_BAD_HOST_ERROR') {
      console.error('\n⚠️  Cannot connect to MySQL server!');
      console.error('Make sure MySQL is installed and running on localhost:3306');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
