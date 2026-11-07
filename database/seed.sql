-- Sample seed data for online_course_lms
USE online_course_lms;

INSERT INTO users (user_id, name, email, password, role) VALUES
(1, 'Lokesh Yadav', 'lokesh.yadav@example.com', '$2a$10$ixBZ.gokI5/Pp6JKzxWN6uOhehnuEJnccCN0RPNEOJCgqTZslJ9Fa', 'instructor'),
(2, 'Sarah Jenkins', 'sarah.jenkins@example.com', '$2a$10$ixBZ.gokI5/Pp6JKzxWN6uOhehnuEJnccCN0RPNEOJCgqTZslJ9Fa', 'student'),
(3, 'Alex Rivera', 'alex.rivera@example.com', '$2a$10$ixBZ.gokI5/Pp6JKzxWN6uOhehnuEJnccCN0RPNEOJCgqTZslJ9Fa', 'student')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO courses (course_id, title, description) VALUES
(1, 'Full-Stack Web Development Bootcamp', 'Master modern full-stack web development using HTML5, CSS3, JavaScript, Node.js, Express.js, and MySQL relational database architecture.'),
(2, 'Relational Database Design with MySQL', 'Learn relational database modeling, foreign key constraints, normalization, SQL joins, indexing, and transaction management from scratch.'),
(3, 'JavaScript Essentials to Advanced', 'Deep dive into asynchronous JavaScript, Event Loop, DOM manipulation, Fetch API, Promises, and modern ES6+ features.')
ON DUPLICATE KEY UPDATE title=VALUES(title);

INSERT INTO lessons (lesson_id, course_id, lesson_title, content, video_url, sequence_no) VALUES
(1, 1, 'Introduction to Full-Stack Architecture', 'Learn client-server fundamentals, HTTP request-response lifecycle, and REST architectural principles.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1),
(2, 1, 'Building Backend APIs with Express.js', 'Creating modular routing, middleware, error handlers, and connecting controller logic.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 2),
(3, 1, 'Integrating MySQL with Node.js', 'Configuring connection pools, executing parameterized queries, and preventing SQL injection.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 3),
(4, 2, 'Relational Modeling & Primary/Foreign Keys', 'Understanding entity relationships, 1-to-many associations, referential integrity constraints, and cascading rules.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1),
(5, 2, 'Writing High-Performance SQL Joins', 'Mastering INNER JOIN, LEFT JOIN, aggregations, GROUP BY, and query optimization techniques.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 2),
(6, 3, 'Modern JavaScript ES6+ Features', 'Explore arrow functions, destructuring, template literals, spread/rest operators, and ES modules.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1),
(7, 3, 'Asynchronous Programming & Fetch API', 'Mastering Promises, async/await syntax, and connecting frontend UI to backend REST endpoints.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 2)
ON DUPLICATE KEY UPDATE lesson_title=VALUES(lesson_title);

INSERT INTO enrollments (enrollment_id, user_id, course_id, enrollment_date, progress, status, completed_lessons) VALUES
(1, 2, 1, '2026-11-01', 33, 'In Progress', '[1]'),
(2, 2, 2, '2026-11-03', 100, 'Completed', '[4,5]'),
(3, 3, 1, '2026-11-05', 0, 'Enrolled', '[]')
ON DUPLICATE KEY UPDATE progress=VALUES(progress), status=VALUES(status), completed_lessons=VALUES(completed_lessons);
