const app = require('./server');

setTimeout(async () => {
    console.log('\n=============================================================');
    console.log(' STARTING ENROLLMENT AND LEARNING PROGRESS TESTS');
    console.log('=============================================================');

    let passed = 0;
    let failed = 0;
    const stamp = Date.now();

    const assert = (condition, name) => {
        if (condition) {
            console.log(' [PASS]', name);
            passed++;
        } else {
            console.error(' [FAIL]', name);
            failed++;
        }
    };

    const api = async (path, method, token, body) => {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(`http://localhost:5000/api${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });
        const json = await response.json();
        return { httpStatus: response.status, ...json };
    };

    try {
        const instructor = await api('/auth/register', 'POST', null, {
            name: 'Progress Instructor',
            email: `progress.instructor.${stamp}@test.com`,
            password: 'Password123',
            role: 'instructor'
        });
        const studentA = await api('/auth/register', 'POST', null, {
            name: 'Student A',
            email: `student.a.${stamp}@test.com`,
            password: 'Password123',
            role: 'student'
        });
        const studentB = await api('/auth/register', 'POST', null, {
            name: 'Student B',
            email: `student.b.${stamp}@test.com`,
            password: 'Password123',
            role: 'student'
        });

        assert(instructor.httpStatus === 201 && studentA.httpStatus === 201 && studentB.httpStatus === 201, '1. Register instructor and two students');

        const course = await api('/courses', 'POST', instructor.token, {
            title: `Progress Lab ${stamp}`,
            description: 'Course used to verify enrollment progress.'
        });
        assert(course.httpStatus === 201 && course.course_id, '2. Instructor creates a course');

        const lessonIds = [];
        for (let i = 1; i <= 4; i++) {
            const lesson = await api('/lessons', 'POST', instructor.token, {
                course_id: course.course_id,
                lesson_title: `Lesson ${i}`,
                content: `Notes for lesson ${i}`,
                sequence_no: i
            });
            lessonIds.push(lesson.lesson_id || (lesson.data && lesson.data.lesson_id));
        }
        assert(lessonIds.filter(Boolean).length === 4, '3. Instructor adds four lessons');

        const locked = await api(`/lessons/course/${course.course_id}`, 'GET', studentA.token);
        assert(locked.httpStatus === 403, '4. Lessons stay locked until the student enrolls');

        const missingCourse = await api('/enrollments', 'POST', studentA.token, { course_id: 999999 });
        assert(missingCourse.httpStatus === 404, '5. Reject enrollment for a missing course');

        const noToken = await api('/enrollments', 'POST', null, { course_id: course.course_id });
        assert(noToken.httpStatus === 401, '6. Reject enrollment without a token');

        const instructorEnroll = await api('/enrollments', 'POST', instructor.token, { course_id: course.course_id });
        assert(instructorEnroll.httpStatus === 403, '7. Only students can enroll');

        const enrolled = await api('/enrollments', 'POST', studentA.token, { course_id: course.course_id });
        assert(
            enrolled.httpStatus === 201 &&
            enrolled.data &&
            enrolled.data.progress === 0 &&
            enrolled.data.status === 'Enrolled' &&
            /^\d{4}-\d{2}-\d{2}$/.test(enrolled.data.enrollment_date) &&
            enrolled.data.user_id === studentA.user.user_id,
            '8. Save enrollment date, zero progress, and Enrolled status'
        );

        const duplicate = await api('/enrollments', 'POST', studentA.token, { course_id: course.course_id });
        assert(duplicate.httpStatus === 409 && duplicate.message.includes('Already enrolled'), '9. Prevent duplicate enrollment');

        const mine = await api('/enrollments/my-courses', 'GET', studentA.token);
        const listed = (mine.data || []).find((item) => item.course_id === course.course_id);
        assert(
            mine.httpStatus === 200 &&
            listed &&
            listed.progress === 0 &&
            listed.status === 'Enrolled' &&
            listed.total_lessons === 4 &&
            listed.enrollment_date,
            '10. Student dashboard data lists only this student enrollment'
        );

        const otherList = await api('/enrollments/my-courses', 'GET', studentB.token);
        const leaked = (otherList.data || []).some((item) => item.enrollment_id === enrolled.data.enrollment_id);
        assert(!leaked, '11. Another student cannot see this enrollment');

        const rawProgress = await api('/enrollments/progress', 'POST', studentA.token, {
            course_id: course.course_id,
            progress: 100
        });
        assert(rawProgress.httpStatus === 400, '12. Reject a client-supplied progress percentage');

        const notEnrolled = await api('/enrollments/progress', 'POST', studentB.token, {
            course_id: course.course_id,
            lesson_id: lessonIds[0],
            is_completed: true,
            user_id: studentA.user.user_id
        });
        assert(notEnrolled.httpStatus === 404, '13. A student cannot update another student enrollment');

        const instructorProgress = await api('/enrollments/progress', 'POST', instructor.token, {
            course_id: course.course_id,
            lesson_id: lessonIds[0],
            is_completed: true
        });
        assert(instructorProgress.httpStatus === 403, '14. Instructors cannot update student progress');

        const otherCourse = await api('/courses', 'POST', instructor.token, {
            title: `Other Course ${stamp}`,
            description: 'Separate curriculum'
        });
        const otherLesson = await api('/lessons', 'POST', instructor.token, {
            course_id: otherCourse.course_id,
            lesson_title: 'Outside lesson',
            content: 'Not part of the enrolled course',
            sequence_no: 1
        });
        const wrongLesson = await api('/enrollments/progress', 'POST', studentA.token, {
            course_id: course.course_id,
            lesson_id: otherLesson.lesson_id,
            is_completed: true
        });
        assert(wrongLesson.httpStatus === 400, '15. Reject a lesson that belongs to a different course');

        const first = await api('/enrollments/progress', 'POST', studentA.token, {
            course_id: course.course_id,
            lesson_id: lessonIds[0],
            is_completed: true,
            progress: 100
        });
        assert(first.httpStatus === 200 && first.progress === 25 && first.status === 'In Progress' && first.completed_count === 1, '16. One of four lessons is 25% In Progress');

        const repeat = await api('/enrollments/progress', 'POST', studentA.token, {
            course_id: course.course_id,
            lesson_id: lessonIds[0],
            is_completed: true
        });
        assert(repeat.progress === 25 && repeat.completed_count === 1, '17. Marking the same lesson complete does not double count');

        await api('/enrollments/progress', 'POST', studentA.token, {
            course_id: course.course_id,
            lesson_id: lessonIds[1],
            is_completed: true
        });
        await api('/enrollments/progress', 'POST', studentA.token, {
            course_id: course.course_id,
            lesson_id: lessonIds[2],
            is_completed: true
        });
        const finished = await api('/enrollments/progress', 'POST', studentA.token, {
            course_id: course.course_id,
            lesson_id: lessonIds[3],
            is_completed: true
        });
        assert(finished.progress === 100 && finished.status === 'Completed' && finished.completed_count === 4, '18. All lessons completed sets 100% and Completed');

        const undone = await api('/enrollments/progress', 'POST', studentA.token, {
            course_id: course.course_id,
            lesson_id: lessonIds[3],
            is_completed: false
        });
        assert(undone.progress === 75 && undone.status === 'In Progress' && undone.completed_count === 3, '19. Unmarking a lesson recalculates to 75%');

        const studentBEnroll = await api('/enrollments', 'POST', studentB.token, { course_id: course.course_id });
        const studentBProgress = await api('/enrollments/progress', 'POST', studentB.token, {
            course_id: course.course_id,
            lesson_id: lessonIds[0],
            is_completed: true,
            user_id: studentA.user.user_id
        });
        const studentAAfter = await api(`/enrollments/course/${course.course_id}`, 'GET', studentA.token);
        assert(
            studentBEnroll.httpStatus === 201 &&
            studentBProgress.progress === 25 &&
            studentAAfter.data.progress === 75 &&
            studentAAfter.data.user_id === studentA.user.user_id,
            '20. Each student progress stays on their own enrollment'
        );

        const opened = await api(`/lessons/course/${course.course_id}`, 'GET', studentA.token);
        assert(opened.httpStatus === 200 && opened.data.length === 4, '21. Enrolled student can open the course lessons');

        console.log('\n=============================================================');
        console.log(' TEST SUMMARY:', passed, 'PASSED,', failed, 'FAILED');
        console.log('=============================================================\n');
    } catch (error) {
        console.error('Test execution error:', error);
        failed++;
    } finally {
        if (app && typeof app.close === 'function') {
            // server is the listener, not the app
        }
        process.exit(failed > 0 ? 1 : 0);
    }
}, 1200);
