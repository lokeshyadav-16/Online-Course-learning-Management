const app = require('./server');

setTimeout(async () => {
    console.log('\n=============================================================');
    console.log(' STARTING COMPREHENSIVE COURSE & LESSON MANAGEMENT TESTS');
    console.log(' Project Owner: Lokesh Yadav');
    console.log('=============================================================');

    let passed = 0;
    let failed = 0;

    const assert = (condition, name) => {
        if (condition) {
            console.log(' [PASS]', name);
            passed++;
        } else {
            console.error(' [FAIL]', name);
            failed++;
        }
    };

    try {
        const baseUrl = 'http://localhost:5000/api';

        // 1. Setup Test Users: Instructor and Student
        const instRes = await fetch(`${baseUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Lead Instructor Lokesh',
                email: 'instructor.lokesh@test.com',
                password: 'Password123',
                role: 'instructor'
            })
        });
        const instData = await instRes.json();
        const instructorToken = instData.token;

        const studRes = await fetch(`${baseUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Student Priya',
                email: 'student.priya@test.com',
                password: 'Password123',
                role: 'student'
            })
        });
        const studData = await studRes.json();
        const studentToken = studData.token;

        assert(instructorToken && studentToken, '1. Setup: Registered instructor & student with valid JWT tokens');

        // 2. Instructor creates a new course
        const createCourseRes = await fetch(`${baseUrl}/courses`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${instructorToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: 'Full-Stack JavaScript & MySQL Masterclass',
                description: 'Comprehensive curriculum by Lokesh Yadav covering Node.js, Express, and relational MySQL.'
            })
        });
        const createdCourse = await createCourseRes.json();
        const courseId = createdCourse.course_id;
        assert(createCourseRes.status === 201 && courseId, `2. Instructor creates course (ID: ${courseId})`);

        // 3. Students browse available courses (Public access)
        const browseRes = await fetch(`${baseUrl}/courses`);
        const browseData = await browseRes.json();
        const foundInCatalog = browseData.data.some(c => c.course_id === courseId);
        assert(browseRes.status === 200 && foundInCatalog, '3. Students browse available courses (Public access)');

        // 4. Student views course details before enrollment -> Lesson list must be locked
        const detailsUnenrolledRes = await fetch(`${baseUrl}/courses/${courseId}`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        const detailsUnenrolled = await detailsUnenrolledRes.json();
        assert(
            detailsUnenrolled.success === true && detailsUnenrolled.data.is_enrolled === false,
            '4. Course details shows is_enrolled = false for unenrolled student'
        );

        // 5. Unenrolled student direct attempt to fetch lessons -> 403 Forbidden
        const forbiddenLessonsRes = await fetch(`${baseUrl}/lessons/course/${courseId}`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        const forbiddenLessonsData = await forbiddenLessonsRes.json();
        assert(
            forbiddenLessonsRes.status === 403 && forbiddenLessonsData.is_enrolled === false,
            '5. Unenrolled student blocked from accessing lessons list (403 Forbidden)'
        );

        // 6. Instructor adds Lesson 1
        const l1Res = await fetch(`${baseUrl}/lessons`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${instructorToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                course_id: courseId,
                lesson_title: '1. Node.js Runtime & Event Loop Fundamentals',
                content: 'Understanding the asynchronous architecture and single-threaded event loop.',
                video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                sequence_no: 1
            })
        });
        const l1Data = await l1Res.json();
        const lesson1Id = l1Data.lesson_id;
        assert(l1Res.status === 201 && lesson1Id, `6. Instructor adds Lesson 1 (ID: ${lesson1Id}, seq: 1)`);

        // 7. Instructor adds Lesson 2
        const l2Res = await fetch(`${baseUrl}/lessons`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${instructorToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                course_id: courseId,
                lesson_title: '2. Express Middleware & REST Design',
                content: 'Building modular routes, controllers, and error handling middleware.',
                video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                sequence_no: 2
            })
        });
        const l2Data = await l2Res.json();
        const lesson2Id = l2Data.lesson_id;
        assert(l2Res.status === 201 && lesson2Id, `7. Instructor adds Lesson 2 (ID: ${lesson2Id}, seq: 2)`);

        // 8. Instructor adds Lesson 3
        const l3Res = await fetch(`${baseUrl}/lessons`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${instructorToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                course_id: courseId,
                lesson_title: '3. MySQL Pooling & Query Normalization',
                content: 'Relational schemas, foreign keys, and connection pooling.',
                video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                sequence_no: 3
            })
        });
        const l3Data = await l3Res.json();
        const lesson3Id = l3Data.lesson_id;
        assert(l3Res.status === 201 && lesson3Id, `8. Instructor adds Lesson 3 (ID: ${lesson3Id}, seq: 3)`);

        // 9. Instructor edits course title and description
        const updateCourseRes = await fetch(`${baseUrl}/courses/${courseId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${instructorToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: 'Full-Stack JavaScript & MySQL Masterclass (Updated Edition)',
                description: 'Updated comprehensive curriculum by Lokesh Yadav.'
            })
        });
        const updatedCourse = await updateCourseRes.json();
        assert(
            updateCourseRes.status === 200 && updatedCourse.data.title.includes('Updated Edition'),
            '9. Instructor edits course title and description (PUT /api/courses/:id)'
        );

        // 10. Instructor edits Lesson 2 details
        const updateLessonRes = await fetch(`${baseUrl}/lessons/${lesson2Id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${instructorToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lesson_title: '2. Express Middleware & Advanced REST Design (Edited)',
                content: 'Updated content with JWT authentication flows.',
                video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                sequence_no: 2
            })
        });
        const updatedLesson = await updateLessonRes.json();
        assert(
            updateLessonRes.status === 200 && updatedLesson.data.lesson_title.includes('(Edited)'),
            '10. Instructor edits lesson details (PUT /api/lessons/:id)'
        );

        // 11. Instructor arranges lessons (swaps Lesson 1 and Lesson 2 sequence)
        const reorderRes = await fetch(`${baseUrl}/lessons/reorder/${courseId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${instructorToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lessonOrder: [
                    { lesson_id: lesson1Id, sequence_no: 2 },
                    { lesson_id: lesson2Id, sequence_no: 1 }
                ]
            })
        });
        const reorderData = await reorderRes.json();
        const reorderedL2 = reorderData.data.find(l => l.lesson_id === lesson2Id);
        assert(
            reorderRes.status === 200 && reorderedL2 && reorderedL2.sequence_no === 1,
            '11. Instructor rearranges lessons sequence (PUT /api/lessons/reorder/:courseId)'
        );

        // 12. Student attempts unauthorized instructor action -> 403 Forbidden
        const unauthRes = await fetch(`${baseUrl}/courses/${courseId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        assert(unauthRes.status === 403, '12. Role check: Student forbidden from modifying courses (403)');

        // 13. Student enrolls in the course
        const enrollRes = await fetch(`${baseUrl}/enrollments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${studentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ course_id: courseId })
        });
        const enrollData = await enrollRes.json();
        assert(
            enrollRes.status === 201 && enrollData.success === true,
            '13. Student successfully enrolls in course (POST /api/enrollments)'
        );

        // 14. Enrolled student now accesses course details -> Curriculum unlocked
        const detailsEnrolledRes = await fetch(`${baseUrl}/courses/${courseId}`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        const detailsEnrolled = await detailsEnrolledRes.json();
        assert(
            detailsEnrolled.data.is_enrolled === true && detailsEnrolled.data.lessons[0].is_locked !== true,
            '14. Enrolled student views unlocked course details with full lesson metadata'
        );

        // 15. Enrolled student views lesson list -> 200 OK
        const enrolledLessonsRes = await fetch(`${baseUrl}/lessons/course/${courseId}`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        const enrolledLessonsData = await enrolledLessonsRes.json();
        assert(
            enrolledLessonsRes.status === 200 && enrolledLessonsData.count === 3,
            '15. Enrolled student accesses full lesson list (GET /api/lessons/course/:courseId)'
        );

        // 16. Instructor deletes a lesson
        const deleteLessonRes = await fetch(`${baseUrl}/lessons/${lesson3Id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${instructorToken}` }
        });
        const deleteLessonData = await deleteLessonRes.json();
        assert(
            deleteLessonRes.status === 200 && deleteLessonData.success === true,
            '16. Instructor deletes a lesson (DELETE /api/lessons/:id)'
        );

        // 17. Verify lesson count reduced to 2
        const verifyLessonsRes = await fetch(`${baseUrl}/lessons/course/${courseId}`, {
            headers: { 'Authorization': `Bearer ${instructorToken}` }
        });
        const verifyLessonsData = await verifyLessonsRes.json();
        assert(
            verifyLessonsData.count === 2,
            '17. Verified lesson list reduced to 2 after deletion'
        );

        // 18. Instructor deletes course (Cascade deletes associated lessons)
        const deleteCourseRes = await fetch(`${baseUrl}/courses/${courseId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${instructorToken}` }
        });
        const deleteCourseData = await deleteCourseRes.json();
        assert(
            deleteCourseRes.status === 200 && deleteCourseData.success === true,
            '18. Instructor deletes course (DELETE /api/courses/:id)'
        );

        // 19. Verify deleted course returns 404
        const verifyDeletedRes = await fetch(`${baseUrl}/courses/${courseId}`);
        assert(
            verifyDeletedRes.status === 404,
            '19. Verified deleted course is no longer available (404 Not Found)'
        );

        console.log('\n=============================================================');
        console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
        console.log('=============================================================\n');
    } catch (err) {
        console.error('Test execution error:', err);
    } finally {
        process.exit(0);
    }
}, 1000);
