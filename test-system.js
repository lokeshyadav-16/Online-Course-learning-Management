const base = 'http://localhost:5000';

const pages = ['/', '/login', '/register', '/courses', '/course-details?id=1', '/student-dashboard', '/instructor-dashboard', '/my-courses', '/lesson?course_id=1&lesson=1', '/create-course', '/courses.html', '/login.html', '/public/css/style.css', '/public/css/responsive.css', '/public/js/main.js', '/public/js/auth.js', '/public/js/courses.js', '/public/js/dashboard.js', '/public/js/lesson.js'];

async function api(path, method = 'GET', token, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(base + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { json = { raw: text.slice(0, 120) }; }
    return { httpStatus: response.status, ...json };
}

(async () => {
    let passed = 0;
    let failed = 0;
    const assert = (ok, name, extra) => {
        if (ok) { console.log(' [PASS]', name); passed++; }
        else { console.error(' [FAIL]', name, extra || ''); failed++; }
    };

    for (let i = 0; i < 20; i++) {
        try {
            const health = await api('/api/health');
            if (health.httpStatus === 200) break;
        } catch (e) { /* server still starting */ }
        await new Promise((r) => setTimeout(r, 500));
    }

    const health = await api('/api/health');
    assert(health.database === 'connected', 'MySQL health is connected', health.database);

    for (const page of pages) {
        const response = await fetch(base + page);
        assert(response.status === 200, `Page ${page} returns 200`, response.status);
    }

    const badLogin = await api('/api/auth/login', 'POST', null, { email: 'sarah.jenkins@example.com', password: 'wrong-pass' });
    assert(badLogin.httpStatus === 401, 'Reject wrong password');

    const student = await api('/api/auth/login', 'POST', null, { email: 'sarah.jenkins@example.com', password: 'Password123' });
    assert(student.httpStatus === 200 && student.user && student.user.role === 'student', 'Student demo login against MySQL', student.message);

    const instructor = await api('/api/auth/login', 'POST', null, { email: 'lokesh.yadav@example.com', password: 'Password123' });
    assert(instructor.httpStatus === 200 && instructor.user.role === 'instructor', 'Instructor demo login against MySQL');

    const me = await api('/api/auth/me', 'GET', student.token);
    assert(me.httpStatus === 200 && me.user.email === 'sarah.jenkins@example.com', 'Auth me uses database user');

    const denied = await api('/api/courses', 'POST', student.token, { title: 'Nope', description: 'Student must not create this' });
    assert(denied.httpStatus === 403, 'Student cannot create a course');

    const courses = await api('/api/courses');
    assert(courses.httpStatus === 200 && courses.count === 3 && courses.data[0].title.includes('Full-Stack'), 'Catalog comes from MySQL seed courses', courses.count);

    const course = await api('/api/courses/1', 'GET', student.token);
    assert(course.httpStatus === 200 && course.data.is_enrolled === true && course.data.lessons.length === 3, 'Enrolled student sees real lessons');

    const fresh = await api('/api/auth/register', 'POST', null, {
        name: 'Exam Student',
        email: `exam.student.${Date.now()}@test.com`,
        password: 'Password123',
        role: 'student'
    });
    assert(fresh.httpStatus === 201 && fresh.token, 'Register a new student in MySQL');

    const dup = await api('/api/auth/register', 'POST', null, {
        name: 'Exam Student',
        email: fresh.user.email,
        password: 'Password123',
        role: 'student'
    });
    assert(dup.httpStatus === 409, 'Duplicate email blocked');

    const emptyBefore = await api('/api/enrollments/my-courses', 'GET', fresh.token);
    assert(emptyBefore.httpStatus === 200 && emptyBefore.count === 0, 'New student has no enrollments');

    const locked = await api('/api/lessons/course/3', 'GET', fresh.token);
    assert(locked.httpStatus === 403, 'Lessons locked before enrollment');

    const enrolled = await api('/api/enrollments', 'POST', fresh.token, { course_id: 3 });
    assert(enrolled.httpStatus === 201 && enrolled.data.status === 'Enrolled' && enrolled.data.progress === 0, 'Enroll saves date, progress, status', enrolled.message);

    const again = await api('/api/enrollments', 'POST', fresh.token, { course_id: 3 });
    assert(again.httpStatus === 409, 'Duplicate enrollment blocked in MySQL');

    const lessons = await api('/api/lessons/course/3', 'GET', fresh.token);
    assert(lessons.httpStatus === 200 && lessons.count === 2, 'Enrolled student can list lessons');

    const marked = await api('/api/enrollments/progress', 'POST', fresh.token, {
        course_id: 3,
        lesson_id: lessons.data[0].lesson_id,
        is_completed: true
    });
    assert(marked.httpStatus === 200 && marked.progress === 50 && marked.status === 'In Progress', 'Progress is 50% after 1 of 2 lessons', marked);

    const other = await api('/api/enrollments/progress', 'POST', student.token, {
        course_id: 3,
        lesson_id: lessons.data[0].lesson_id,
        is_completed: true,
        user_id: fresh.user.user_id
    });
    assert(other.httpStatus === 404, 'Another student cannot update this enrollment');

    const created = await api('/api/courses', 'POST', instructor.token, {
        title: 'Exam Temporary Course',
        description: 'Created during the full system test'
    });
    assert(created.httpStatus === 201 && created.course_id, 'Instructor creates a course');

    const lesson = await api('/api/lessons', 'POST', instructor.token, {
        course_id: created.course_id,
        lesson_title: 'Temp Lesson',
        content: 'Temp notes',
        sequence_no: 1
    });
    assert(lesson.httpStatus === 201 && lesson.lesson_id, 'Instructor creates a lesson');

    const updated = await api(`/api/lessons/${lesson.lesson_id}`, 'PUT', instructor.token, {
        lesson_title: 'Temp Lesson Updated',
        content: 'Updated notes',
        sequence_no: 1
    });
    assert(updated.httpStatus === 200, 'Instructor updates a lesson', updated.message);

    const studentLesson = await api('/api/lessons', 'POST', fresh.token, {
        course_id: created.course_id,
        lesson_title: 'Blocked',
        content: 'no'
    });
    assert(studentLesson.httpStatus === 403, 'Student cannot create lessons');

    const removedLesson = await api(`/api/lessons/${lesson.lesson_id}`, 'DELETE', instructor.token);
    const removedCourse = await api(`/api/courses/${created.course_id}`, 'DELETE', instructor.token);
    assert(removedLesson.httpStatus === 200 && removedCourse.httpStatus === 200, 'Instructor can delete the test lesson and course');

    const stats = await api('/api/users/stats', 'GET', instructor.token);
    assert(stats.httpStatus === 200 && stats.stats.total_courses >= 3 && stats.stats.total_students >= 2, 'Platform stats come from MySQL', stats.stats);

    console.log('\n SUMMARY:', passed, 'PASSED,', failed, 'FAILED');
    process.exit(failed > 0 ? 1 : 0);
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
