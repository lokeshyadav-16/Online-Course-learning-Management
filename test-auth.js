const app = require('./server');

setTimeout(async () => {
    console.log('\n=============================================');
    console.log(' STARTING COMPREHENSIVE AUTHENTICATION TESTS');
    console.log('=============================================');
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
        // 1. Invalid email format
        const r1 = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Alex', email: 'not-an-email', password: 'Password123', role: 'student' })
        });
        const j1 = await r1.json();
        assert(r1.status === 400 && j1.message.includes('valid email'), '1. Reject invalid email format');

        // 2. Password too short (< 6 chars)
        const r2 = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Alex', email: 'alex.valid@example.com', password: '123', role: 'student' })
        });
        const j2 = await r2.json();
        assert(r2.status === 400 && j2.message.includes('at least 6 characters'), '2. Reject password < 6 characters');

        // 3. Successful Student Registration
        const r3 = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Alex Rivera', email: 'alex.rivera@test.com', password: 'Password123', role: 'student' })
        });
        const j3 = await r3.json();
        assert(r3.status === 201 && j3.token && j3.user.role === 'student', '3. Register new student with hashed password & JWT');

        // 4. Duplicate email prevention
        const r4 = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Alex Duplicate', email: 'alex.rivera@test.com', password: 'DifferentPassword123', role: 'student' })
        });
        const j4 = await r4.json();
        assert(r4.status === 409 && j4.message.includes('already registered'), '4. Prevent duplicate email registration (409 Conflict)');

        // 5. Successful Instructor Registration
        const r5 = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Professor Yadav', email: 'prof.yadav@test.com', password: 'SecurePassword123', role: 'instructor' })
        });
        const j5 = await r5.json();
        assert(r5.status === 201 && j5.token && j5.user.role === 'instructor', '5. Register new instructor with role=instructor');

        // 6. Login with invalid password
        const r6 = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'alex.rivera@test.com', password: 'WrongPassword' })
        });
        const j6 = await r6.json();
        assert(r6.status === 401 && j6.message.includes('Invalid email or password'), '6. Reject login with incorrect password');

        // 7. Student Login with correct password
        const r7 = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'alex.rivera@test.com', password: 'Password123' })
        });
        const j7 = await r7.json();
        const studentToken = j7.token;
        assert(r7.status === 200 && studentToken && j7.user.role === 'student', '7. Student login success & JWT generation');

        // 8. Instructor Login with correct password
        const r8 = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'prof.yadav@test.com', password: 'SecurePassword123' })
        });
        const j8 = await r8.json();
        const instructorToken = j8.token;
        assert(r8.status === 200 && instructorToken && j8.user.role === 'instructor', '8. Instructor login success & role verification');

        // 9. Protected route GET /api/auth/me with Student Token
        const r9 = await fetch('http://localhost:5000/api/auth/me', {
            headers: { 'Authorization': 'Bearer ' + studentToken }
        });
        const j9 = await r9.json();
        assert(r9.status === 200 && j9.user.email === 'alex.rivera@test.com', '9. Protected /api/auth/me returns authenticated user');

        // 10. Role-based access: Student attempting instructor-restricted action
        const r10 = await fetch('http://localhost:5000/api/courses', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + studentToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Unauthorized Course', description: 'desc' })
        });
        const j10 = await r10.json();
        assert(r10.status === 403 && j10.message.includes('Access denied'), '10. Role check: Deny student from instructor actions (403)');

        // 11. Role-based access: Instructor allowed to create course
        const r11 = await fetch('http://localhost:5000/api/courses', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + instructorToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'New Advanced Architecture Course', description: 'Instructor created curriculum.' })
        });
        const j11 = await r11.json();
        assert(r11.status === 201 && j11.success === true, '11. Role check: Allow instructor to create courses (201)');

        // 12. Unauthenticated access without token
        const r12 = await fetch('http://localhost:5000/api/auth/me');
        assert(r12.status === 401, '12. Reject protected request without token (401)');

        console.log('\n=============================================');
        console.log(' TEST SUMMARY:', passed, 'PASSED,', failed, 'FAILED');
        console.log('=============================================\n');
    } catch(err) {
        console.error('Test execution error:', err);
    } finally {
        process.exit(0);
    }
}, 1000);
