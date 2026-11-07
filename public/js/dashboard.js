/* =========================================================
   Online Course Learning Management System - Dashboard Logic
   Project Owner: Lokesh Yadav
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
    const user = Auth.getUser();

    const safeText = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const statusLabel = (item) => {
        if (item.status) return item.status;
        if ((item.progress || 0) >= 100) return 'Completed';
        if ((item.progress || 0) > 0) return 'In Progress';
        return 'Enrolled';
    };

    // 1. Student Dashboard Logic
    const studentContainer = document.getElementById('studentDashboardCourses');
    if (studentContainer) {
        loadStudentDashboard();
    }

    // 2. My Courses Page Logic
    const myCoursesContainer = document.getElementById('myCoursesGrid');
    if (myCoursesContainer) {
        loadMyCoursesPage();
    }

    // 3. Instructor Dashboard & Course/Lesson Management Logic
    const instructorContainer = document.getElementById('instructorCoursesTableBody');
    if (instructorContainer) {
        initInstructorDashboard();
    }

    // 4. Create Course Page Form Submission
    const createCourseForm = document.getElementById('createCourseForm');
    if (createCourseForm) {
        createCourseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const publishBtn = document.getElementById('publishCourseBtn');
            publishBtn.disabled = true;
            publishBtn.textContent = 'Publishing Course...';

            const title = document.getElementById('courseTitle').value.trim();
            const description = document.getElementById('courseDescription').value.trim();

            const res = await apiRequest('/courses', 'POST', { title, description });

            if (res.success) {
                alert('Course published successfully! You can now add curriculum lessons in your studio.');
                window.location.href = '/instructor-dashboard.html';
            } else {
                alert(res.message || 'Error publishing course.');
                publishBtn.disabled = false;
                publishBtn.textContent = 'Publish Course Now';
            }
        });
    }

    // =========================================================
    // STUDENT DASHBOARD
    // =========================================================
    async function loadStudentDashboard() {
        studentContainer.innerHTML = `
            <div style="grid-column: 1/-1; padding: 28px; text-align: center; color: var(--text-muted);">
                Loading your enrolled courses...
            </div>
        `;

        const res = await apiRequest('/enrollments/my-courses');
        const enrollments = (res.success && Array.isArray(res.data)) ? res.data : [];

        const statEnrolled = document.getElementById('statStudentEnrolled');
        const statCompleted = document.getElementById('statStudentCompleted');
        const statHours = document.getElementById('statStudentHours');

        const completedCount = enrollments.filter(e => statusLabel(e) === 'Completed' || (e.progress || 0) >= 100).length;
        const lessonsCompleted = enrollments.reduce((sum, item) => sum + (item.completed_count || (item.completed_lessons ? item.completed_lessons.length : 0)), 0);
        if (statEnrolled) statEnrolled.textContent = enrollments.length;
        if (statCompleted) statCompleted.textContent = completedCount;
        if (statHours) statHours.textContent = lessonsCompleted;

        if (!res.success) {
            studentContainer.innerHTML = `
                <div style="grid-column: 1/-1; padding: 40px; text-align: center; background: #ffffff; border-radius: 16px; border: 1px solid var(--card-border);">
                    <h3>Could not load enrollments</h3>
                    <p class="text-muted" style="margin: 8px 0 20px;">${safeText(res.message || 'Sign in as a student and try again.')}</p>
                    <a href="/login.html" class="btn btn-primary">Sign In</a>
                </div>
            `;
            return;
        }

        if (enrollments.length > 0) {
            studentContainer.innerHTML = enrollments.map(item => {
                const progress = Math.min(100, Math.max(0, parseInt(item.progress, 10) || 0));
                const status = statusLabel(item);
                const completedLessons = item.completed_count ?? (item.completed_lessons ? item.completed_lessons.length : 0);
                const totalLessons = item.total_lessons || 0;
                return `
                <div class="course-card">
                    <div class="course-card-body">
                        <div class="course-meta">
                            <span class="badge ${status === 'Completed' ? 'badge-green' : 'badge-purple'}">
                                ${status === 'Completed' ? '✓ Completed' : safeText(status)}
                            </span>
                            <span class="text-muted" style="font-size:0.85rem;">Enrolled: ${safeText(item.enrollment_date || 'Today')}</span>
                        </div>
                        <h3><a href="/lesson.html?course_id=${item.course_id}">${safeText(item.title)}</a></h3>
                        <p class="text-muted" style="font-size:0.88rem;">${item.description ? safeText(item.description.substring(0, 80)) + '...' : 'Interactive curriculum'}</p>
                        
                        <div style="margin: 18px 0 14px;">
                            <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:6px;">
                                <span style="font-weight:600;">Overall Progress</span>
                                <strong style="color:var(--purple-700);">${progress}%</strong>
                            </div>
                            <div class="progress-container" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100" aria-label="Course progress">
                                <div class="progress-bar-fill" style="width: ${progress}%;"></div>
                            </div>
                            <div class="text-muted" style="font-size:0.8rem; margin-top:6px;">${completedLessons} of ${totalLessons} lessons completed</div>
                        </div>

                        <div class="course-card-footer">
                            <a href="/lesson.html?course_id=${item.course_id}&lesson=1" class="btn btn-primary btn-block">
                                ${status === 'Completed' ? 'Review Lessons' : '▶ Resume Next Lesson'}
                            </a>
                        </div>
                    </div>
                </div>
            `;
            }).join('');
        } else {
            studentContainer.innerHTML = `
                <div style="grid-column: 1/-1; padding: 40px; text-align: center; background: #ffffff; border-radius: 16px; border: 1px solid var(--card-border);">
                    <h3>You haven't enrolled in any courses yet</h3>
                    <p class="text-muted" style="margin: 8px 0 20px;">Explore our catalog to start building your technical skills.</p>
                    <a href="/courses.html" class="btn btn-primary">Browse Course Catalog</a>
                </div>
            `;
        }
    }

    // =========================================================
    // MY COURSES PAGE
    // =========================================================
    async function loadMyCoursesPage() {
        myCoursesContainer.innerHTML = `
            <div style="grid-column: 1/-1; padding: 28px; text-align: center; color: var(--text-muted);">
                Loading your courses...
            </div>
        `;
        const res = await apiRequest('/enrollments/my-courses');
        const enrollments = (res.success && Array.isArray(res.data)) ? res.data : [];
        const tabBtns = document.querySelectorAll('.my-courses-tab');

        function renderFiltered(filterType = 'all') {
            let list = enrollments;
            if (filterType === 'in_progress') list = enrollments.filter(e => (e.progress || 0) < 100);
            if (filterType === 'completed') list = enrollments.filter(e => (e.progress || 0) >= 100);

            if (list.length > 0) {
                myCoursesContainer.innerHTML = list.map(item => {
                    const progress = Math.min(100, Math.max(0, parseInt(item.progress, 10) || 0));
                    const status = statusLabel(item);
                    const completedLessons = item.completed_count ?? (item.completed_lessons ? item.completed_lessons.length : 0);
                    const totalLessons = item.total_lessons || 0;
                    return `
                    <div class="course-card">
                        <div class="course-card-body">
                            <div class="course-meta">
                                <span class="badge ${status === 'Completed' ? 'badge-green' : 'badge-purple'}">
                                    ${safeText(status)}
                                </span>
                                <span style="font-size:0.85rem; font-weight:700; color:var(--purple-700);">${progress}%</span>
                            </div>
                            <h3><a href="/lesson.html?course_id=${item.course_id}">${safeText(item.title)}</a></h3>
                            <p class="text-muted" style="font-size:0.82rem; margin-top:6px;">Enrolled ${safeText(item.enrollment_date || '')} · ${completedLessons}/${totalLessons} lessons</p>
                            
                            <div class="progress-container" style="margin: 15px 0;" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100" aria-label="Course progress">
                                <div class="progress-bar-fill" style="width: ${progress}%;"></div>
                            </div>

                            <div class="course-card-footer">
                                <a href="/lesson.html?course_id=${item.course_id}&lesson=1" class="btn btn-primary btn-sm btn-block">
                                    ${status === 'Completed' ? 'Replay Lessons' : 'Go to Classroom'}
                                </a>
                            </div>
                        </div>
                    </div>
                `;
                }).join('');
            } else {
                myCoursesContainer.innerHTML = `
                    <div style="grid-column: 1/-1; padding: 50px 20px; text-align: center; background: #ffffff; border-radius: 16px; border: 1px solid var(--card-border);">
                        <h3>No courses in this tab</h3>
                        <p class="text-muted">Find fresh courses from our certified curriculum.</p>
                        <a href="/courses.html" class="btn btn-outline-purple" style="margin-top:14px;">Browse Catalog</a>
                    </div>
                `;
            }
        }

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderFiltered(btn.getAttribute('data-filter'));
            });
        });

        renderFiltered('all');
    }

    // =========================================================
    // INSTRUCTOR DASHBOARD (COURSES & LESSONS MANAGEMENT)
    // =========================================================
    let currentManagingCourseId = null;
    let currentLessonsList = [];

    async function initInstructorDashboard() {
        const profileName = document.getElementById('instructorProfileName');
        if (profileName && user) {
            profileName.textContent = user.name || 'Lokesh Yadav';
        }

        await refreshCoursesTable();

        // 1. Course Edit Form Handler
        const editCourseForm = document.getElementById('editCourseForm');
        if (editCourseForm) {
            editCourseForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const saveBtn = document.getElementById('saveCourseChangesBtn');
                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving...';

                const courseId = document.getElementById('editCourseId').value;
                const title = document.getElementById('editCourseTitle').value.trim();
                const description = document.getElementById('editCourseDesc').value.trim();

                const res = await apiRequest(`/courses/${courseId}`, 'PUT', { title, description });

                if (res.success) {
                    closeModal('editCourseModal');
                    await refreshCoursesTable();
                    alert('Course details updated successfully!');
                } else {
                    alert(res.message || 'Error updating course.');
                }
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Changes';
            });
        }

        // Close Edit Course Modal buttons
        const closeEditBtn = document.getElementById('closeEditCourseModalBtn');
        const cancelEditBtn = document.getElementById('cancelEditCourseModalBtn');
        if (closeEditBtn) closeEditBtn.onclick = () => closeModal('editCourseModal');
        if (cancelEditBtn) cancelEditBtn.onclick = () => closeModal('editCourseModal');

        // 2. Lesson Upsert Form Handler (Add or Edit)
        const lessonUpsertForm = document.getElementById('lessonUpsertForm');
        if (lessonUpsertForm) {
            lessonUpsertForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const saveLessonBtn = document.getElementById('saveLessonBtn');
                saveLessonBtn.disabled = true;

                const lessonId = document.getElementById('upsertLessonId').value;
                const courseId = currentManagingCourseId;
                const lessonTitle = document.getElementById('lessonTitleInput').value.trim();
                const sequenceNo = document.getElementById('lessonSequenceInput').value;
                const videoUrl = document.getElementById('lessonVideoInput').value.trim();
                const content = document.getElementById('lessonContentInput').value.trim();

                if (lessonId) {
                    // EDIT Lesson: PUT /api/lessons/:id
                    const res = await apiRequest(`/lessons/${lessonId}`, 'PUT', {
                        lesson_title: lessonTitle,
                        sequence_no: sequenceNo,
                        video_url: videoUrl,
                        content: content
                    });
                    if (res.success) {
                        resetLessonForm();
                        await loadLessonsForCourse(courseId);
                        alert('Lesson updated successfully!');
                    } else {
                        alert(res.message || 'Error updating lesson.');
                    }
                } else {
                    // CREATE Lesson: POST /api/lessons
                    const res = await apiRequest('/lessons', 'POST', {
                        course_id: courseId,
                        lesson_title: lessonTitle,
                        sequence_no: sequenceNo,
                        video_url: videoUrl,
                        content: content
                    });
                    if (res.success) {
                        resetLessonForm();
                        await loadLessonsForCourse(courseId);
                        alert('Lesson created and added to curriculum!');
                    } else {
                        alert(res.message || 'Error creating lesson.');
                    }
                }

                saveLessonBtn.disabled = false;
                await refreshCoursesTable();
            });
        }

        // Reset lesson form button
        const resetLessonBtn = document.getElementById('resetLessonFormBtn');
        if (resetLessonBtn) {
            resetLessonBtn.addEventListener('click', resetLessonForm);
        }

        // Close Manage Lessons Modal button
        const closeManageLessonsBtn = document.getElementById('closeManageLessonsModalBtn');
        if (closeManageLessonsBtn) {
            closeManageLessonsBtn.onclick = () => closeModal('manageLessonsModal');
        }
    }

    async function refreshCoursesTable() {
        const coursesRes = await apiRequest('/courses');
        const courses = coursesRes.data || [];

        const statTotalCourses = document.getElementById('statInstCourses');
        const statTotalStudents = document.getElementById('statInstStudents');
        const statsRes = await apiRequest('/users/stats');
        if (statTotalCourses) statTotalCourses.textContent = (statsRes.success && statsRes.stats) ? statsRes.stats.total_courses : courses.length;
        if (statTotalStudents) statTotalStudents.textContent = (statsRes.success && statsRes.stats) ? statsRes.stats.total_students : 0;

        if (courses.length > 0) {
            instructorContainer.innerHTML = courses.map(c => `
                <tr>
                    <td><strong>#${c.course_id}</strong></td>
                    <td>
                        <div style="font-weight:700; color:var(--navy-900);">${c.title}</div>
                        <a href="/course-details.html?id=${c.course_id}" target="_blank" style="font-size:0.8rem;">View Public Page ↗</a>
                    </td>
                    <td><span class="badge badge-purple">${c.total_lessons || (c.lessons ? c.lessons.length : 0)} Lessons</span></td>
                    <td style="max-width:280px; font-size:0.88rem; color:var(--text-muted);">
                        ${c.description ? (c.description.length > 70 ? c.description.substring(0, 70) + '...' : c.description) : 'No description'}
                    </td>
                    <td>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button class="btn btn-outline-purple btn-sm" onclick="window.openManageLessonsModal(${c.course_id}, '${escapeHtml(c.title)}')">
                                📚 Lessons
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="window.openEditCourseModal(${c.course_id}, '${escapeHtml(c.title)}', '${escapeHtml(c.description || '')}')">
                                ✏️ Edit
                            </button>
                            <button class="btn btn-secondary btn-sm" style="color:var(--accent-rose) !important;" onclick="window.deleteCourseHandler(${c.course_id}, '${escapeHtml(c.title)}')">
                                🗑️ Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            instructorContainer.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding:30px; color:var(--text-muted);">
                        No courses created yet. Click "+ Create New Course" to get started!
                    </td>
                </tr>
            `;
        }
    }

    // Modal Helpers
    function openModal(id) {
        const m = document.getElementById(id);
        if (m) m.classList.remove('d-none');
    }

    function closeModal(id) {
        const m = document.getElementById(id);
        if (m) m.classList.add('d-none');
    }

    function escapeHtml(str) {
        return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    // Window-scoped handlers for table button actions
    window.openEditCourseModal = (courseId, title, desc) => {
        document.getElementById('editCourseId').value = courseId;
        document.getElementById('editCourseTitle').value = title;
        document.getElementById('editCourseDesc').value = desc;
        openModal('editCourseModal');
    };

    window.deleteCourseHandler = async (courseId, title) => {
        if (!confirm(`Are you sure you want to delete the course "${title}"? This will permanently delete the course and all associated lessons.`)) {
            return;
        }

        const res = await apiRequest(`/courses/${courseId}`, 'DELETE');
        if (res.success) {
            alert('Course deleted successfully.');
            await refreshCoursesTable();
        } else {
            alert(res.message || 'Error deleting course.');
        }
    };

    window.openManageLessonsModal = async (courseId, courseTitle) => {
        currentManagingCourseId = courseId;
        document.getElementById('upsertCourseId').value = courseId;
        document.getElementById('manageLessonsModalTitle').textContent = `Manage Lessons: ${courseTitle}`;
        resetLessonForm();
        openModal('manageLessonsModal');
        await loadLessonsForCourse(courseId);
    };

    async function loadLessonsForCourse(courseId) {
        const container = document.getElementById('lessonsListContainer');
        container.innerHTML = '<div style="padding:15px; text-align:center;">Loading curriculum lessons...</div>';

        const res = await apiRequest(`/lessons/course/${courseId}`);
        currentLessonsList = (res.success && res.data) ? res.data : [];

        if (currentLessonsList.length > 0) {
            container.innerHTML = currentLessonsList.map((l, idx) => `
                <div class="lesson-row-card">
                    <div style="display:flex; align-items:center; gap:12px; flex:1;">
                        <span class="seq-badge">${l.sequence_no}</span>
                        <div>
                            <strong style="color:var(--navy-900); font-size:0.95rem;">${l.lesson_title}</strong>
                            <div class="text-muted" style="font-size:0.8rem;">
                                ${l.video_url ? '🎬 Has Video Lecture' : '📄 Lecture Notes'} 
                                ${l.content ? '• ' + l.content.substring(0, 45) + '...' : ''}
                            </div>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <!-- Arrange sequence buttons (Move Up / Move Down) -->
                        <button type="button" class="btn btn-secondary btn-sm" title="Move Up in Sequence" ${idx === 0 ? 'disabled style="opacity:0.4;"' : ''} onclick="window.swapLessonSequence(${idx}, ${idx - 1})">
                            ▲
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm" title="Move Down in Sequence" ${idx === currentLessonsList.length - 1 ? 'disabled style="opacity:0.4;"' : ''} onclick="window.swapLessonSequence(${idx}, ${idx + 1})">
                            ▼
                        </button>
                        <!-- Edit & Delete -->
                        <button type="button" class="btn btn-secondary btn-sm" onclick="window.editLessonPreFill(${l.lesson_id})">
                            ✏️ Edit
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm" style="color:var(--accent-rose) !important;" onclick="window.deleteLessonHandler(${l.lesson_id}, '${escapeHtml(l.lesson_title)}')">
                            🗑️
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div style="padding:20px; text-align:center; background:#ffffff; border-radius:8px; border:1px dashed var(--card-border); color:var(--text-muted);">
                    No lessons in this course yet. Use the form above to add your first lesson!
                </div>
            `;
        }
    }

    function resetLessonForm() {
        document.getElementById('upsertLessonId').value = '';
        document.getElementById('lessonTitleInput').value = '';
        document.getElementById('lessonSequenceInput').value = '';
        document.getElementById('lessonVideoInput').value = '';
        document.getElementById('lessonContentInput').value = '';
        document.getElementById('lessonFormHeader').textContent = '➕ Add New Lesson';
        document.getElementById('saveLessonBtn').textContent = 'Add Lesson';
        const cancelBtn = document.getElementById('resetLessonFormBtn');
        if (cancelBtn) cancelBtn.classList.add('d-none');
    }

    window.editLessonPreFill = (lessonId) => {
        const l = currentLessonsList.find(item => item.lesson_id === lessonId);
        if (!l) return;

        document.getElementById('upsertLessonId').value = l.lesson_id;
        document.getElementById('lessonTitleInput').value = l.lesson_title;
        document.getElementById('lessonSequenceInput').value = l.sequence_no;
        document.getElementById('lessonVideoInput').value = l.video_url || '';
        document.getElementById('lessonContentInput').value = l.content || '';

        document.getElementById('lessonFormHeader').textContent = `✏️ Edit Lesson #${l.sequence_no}`;
        document.getElementById('saveLessonBtn').textContent = 'Update Lesson';

        const cancelBtn = document.getElementById('resetLessonFormBtn');
        if (cancelBtn) cancelBtn.classList.remove('d-none');

        document.getElementById('lessonTitleInput').focus();
    };

    window.deleteLessonHandler = async (lessonId, lessonTitle) => {
        if (!confirm(`Are you sure you want to delete lesson "${lessonTitle}"?`)) {
            return;
        }

        const res = await apiRequest(`/lessons/${lessonId}`, 'DELETE');
        if (res.success) {
            await loadLessonsForCourse(currentManagingCourseId);
            await refreshCoursesTable();
        } else {
            alert(res.message || 'Error deleting lesson.');
        }
    };

    window.swapLessonSequence = async (currIdx, targetIdx) => {
        if (currIdx < 0 || targetIdx < 0 || currIdx >= currentLessonsList.length || targetIdx >= currentLessonsList.length) {
            return;
        }

        const currLesson = currentLessonsList[currIdx];
        const targetLesson = currentLessonsList[targetIdx];

        // Swap sequence_no values
        const orderData = [
            { lesson_id: currLesson.lesson_id, sequence_no: targetLesson.sequence_no },
            { lesson_id: targetLesson.lesson_id, sequence_no: currLesson.sequence_no }
        ];

        const res = await apiRequest(`/lessons/reorder/${currentManagingCourseId}`, 'PUT', {
            lessonOrder: orderData
        });

        if (res.success) {
            await loadLessonsForCourse(currentManagingCourseId);
        } else {
            alert(res.message || 'Error rearranging lessons.');
        }
    };
});
