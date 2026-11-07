-- ========================================================
-- Online Course Learning Management System Database Schema
-- Project Owner: Lokesh Yadav
-- Database Name: online_course_lms
-- ========================================================

-- 1. Create and select the database
CREATE DATABASE IF NOT EXISTS online_course_lms;
USE online_course_lms;

-- Drop tables in reverse order of foreign key dependencies to allow clean re-runs
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS lessons;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS users;

-- ========================================================
-- TABLE 1: users
-- ========================================================
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student'
);

-- ========================================================
-- TABLE 2: courses
-- ========================================================
CREATE TABLE courses (
    course_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(150) NOT NULL,
    description TEXT
);

-- ========================================================
-- TABLE 3: lessons
-- ========================================================
CREATE TABLE lessons (
    lesson_id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    lesson_title VARCHAR(150) NOT NULL,
    content TEXT,
    video_url VARCHAR(255),
    sequence_no INT NOT NULL DEFAULT 1,
    CONSTRAINT fk_lessons_course 
        FOREIGN KEY (course_id) 
        REFERENCES courses(course_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- ========================================================
-- TABLE 4: enrollments
-- ========================================================
CREATE TABLE enrollments (
    enrollment_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    enrollment_date DATE DEFAULT (CURRENT_DATE),
    progress INT DEFAULT 0,
    status VARCHAR(30) DEFAULT 'Enrolled',
    completed_lessons TEXT NULL,
    CONSTRAINT fk_enrollments_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(user_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_enrollments_course 
        FOREIGN KEY (course_id) 
        REFERENCES courses(course_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT uq_user_course UNIQUE (user_id, course_id)
);

-- ========================================================
-- SAMPLE DATA FOR TESTING
-- ========================================================

-- Insert Sample Users (Password is bcrypt hashed for 'Password123')
INSERT INTO users (user_id, name, email, password, role) VALUES
(1, 'Lokesh Yadav', 'lokesh.yadav@example.com', '$2a$10$ixBZ.gokI5/Pp6JKzxWN6uOhehnuEJnccCN0RPNEOJCgqTZslJ9Fa', 'instructor'),
(2, 'Sarah Jenkins', 'sarah.jenkins@example.com', '$2a$10$ixBZ.gokI5/Pp6JKzxWN6uOhehnuEJnccCN0RPNEOJCgqTZslJ9Fa', 'student'),
(3, 'Alex Rivera', 'alex.rivera@example.com', '$2a$10$ixBZ.gokI5/Pp6JKzxWN6uOhehnuEJnccCN0RPNEOJCgqTZslJ9Fa', 'student');

-- Insert Sample Courses
INSERT INTO courses (course_id, title, description) VALUES
(1, 'Full-Stack Web Development Bootcamp', 'Master modern full-stack web development using HTML5, CSS3, JavaScript, Node.js, Express.js, and MySQL relational database architecture.'),
(2, 'Relational Database Design with MySQL', 'Learn relational database modeling, foreign key constraints, normalization, SQL joins, indexing, and transaction management from scratch.'),
(3, 'JavaScript Essentials to Advanced', 'Deep dive into asynchronous JavaScript, Event Loop, DOM manipulation, Fetch API, Promises, and modern ES6+ features.');

-- Insert Sample Lessons
INSERT INTO lessons (lesson_id, course_id, lesson_title, content, video_url, sequence_no) VALUES
-- Lessons for Course 1
(1, 1, 'Introduction to Full-Stack Architecture', 'Learn client-server fundamentals, HTTP request-response lifecycle, and REST architectural principles.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1),
(2, 1, 'Building Backend APIs with Express.js', 'Creating modular routing, middleware, error handlers, and connecting controller logic.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 2),
(3, 1, 'Integrating MySQL with Node.js', 'Configuring connection pools, executing parameterized queries, and preventing SQL injection.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 3),

-- Lessons for Course 2
(4, 2, 'Relational Modeling & Primary/Foreign Keys', 'Understanding entity relationships, 1-to-many associations, referential integrity constraints, and cascading rules.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1),
(5, 2, 'Writing High-Performance SQL Joins', 'Mastering INNER JOIN, LEFT JOIN, aggregations, GROUP BY, and query optimization techniques.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 2),

-- Lessons for Course 3
(6, 3, 'Modern JavaScript ES6+ Features', 'Explore arrow functions, destructuring, template literals, spread/rest operators, and ES modules.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1),
(7, 3, 'Asynchronous Programming & Fetch API', 'Mastering Promises, async/await syntax, and connecting frontend UI to backend REST endpoints.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 2);

-- Insert Sample Enrollments
-- Progress is completed lessons / total lessons (course 1 has 3 lessons, course 2 has 2)
INSERT INTO enrollments (enrollment_id, user_id, course_id, enrollment_date, progress, status, completed_lessons) VALUES
(1, 2, 1, '2026-11-01', 33, 'In Progress', '[1]'),
(2, 2, 2, '2026-11-03', 100, 'Completed', '[4,5]'),
(3, 3, 1, '2026-11-05', 0, 'Enrolled', '[]');
