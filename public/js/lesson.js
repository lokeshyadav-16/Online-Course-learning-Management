/* =========================================================
   Online Course Learning Management System - Lesson View Logic
   Project Owner: Lokesh Yadav
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = parseInt(urlParams.get('course_id') || '1', 10);
    let activeLessonSeq = parseInt(urlParams.get('lesson') || '1', 10);

    // 1. Fetch Course Info
    const courseRes = await apiRequest(`/courses/${courseId}`);
    if (!courseRes.success || !courseRes.data) {
        alert('Course not found.');
        window.location.href = '/courses.html';
        return;
    }
    const course = courseRes.data;

    // 2. Fetch Lessons for Course (Validates Enrollment on backend)
    const lessonsRes = await apiRequest(`/lessons/course/${courseId}`);
    
    // If student is not enrolled, redirect to course details
    if (!lessonsRes.success && lessonsRes.status === 403) {
        alert('🔒 Enrollment Required: You must enroll in this course to access the curriculum lessons.');
        window.location.href = `/course-details.html?id=${courseId}`;
        return;
    }

    const lessons = (lessonsRes.success && lessonsRes.data && lessonsRes.data.length > 0)
        ? lessonsRes.data
        : (course.lessons || []);

    if (lessons.length === 0) {
        alert('This course does not have any published lessons yet.');
        window.location.href = `/course-details.html?id=${courseId}`;
        return;
    }

    let currentLesson = lessons.find(l => l.sequence_no === activeLessonSeq) || lessons[0];

    const user = Auth.getUser();
    const enrollmentRes = await apiRequest(`/enrollments/course/${courseId}`);
    let enrollment = null;
    let canTrackProgress = false;

    if (enrollmentRes.success && enrollmentRes.data) {
        enrollment = enrollmentRes.data;
        enrollment.completed_lessons = (enrollment.completed_lessons || []).map((id) => parseInt(id, 10));
        canTrackProgress = !user || user.role === 'student';
    } else if (user && (user.role === 'instructor' || user.role === 'admin')) {
        enrollment = {
            completed_lessons: [],
            progress: 0,
            status: 'Preview',
            total_lessons: lessons.length
        };
    } else {
        alert(enrollmentRes.message || 'You must enroll in this course before tracking progress.');
        window.location.href = `/course-details.html?id=${courseId}`;
        return;
    }

    // Update Header
    const courseTitleLink = document.getElementById('lessonCourseTitleLink');
    if (courseTitleLink) {
        courseTitleLink.textContent = `← Back to ${course.title}`;
        courseTitleLink.href = `/course-details.html?id=${courseId}`;
    }

    function renderProgress() {
        const completedCount = enrollment && enrollment.completed_lessons ? enrollment.completed_lessons.length : 0;
        const total = lessons.length || enrollment.total_lessons || 1;
        const pct = typeof enrollment.progress === 'number'
            ? Math.min(100, Math.max(0, enrollment.progress))
            : Math.min(100, Math.round((completedCount / total) * 100));
        const status = enrollment.status || (pct >= 100 ? 'Completed' : pct > 0 ? 'In Progress' : 'Enrolled');

        const progressText = document.getElementById('lessonProgressBarText');
        if (progressText) progressText.textContent = `${pct}% · ${status} (${completedCount}/${total} lessons)`;

        const progressBarFill = document.getElementById('lessonProgressBarFill');
        if (progressBarFill) progressBarFill.style.width = `${pct}%`;
    }

    function renderCurriculumSidebar() {
        const sidebarList = document.getElementById('classroomCurriculumList');
        if (!sidebarList) return;

        sidebarList.innerHTML = lessons.map(l => {
            const completedIds = (enrollment.completed_lessons || []).map((id) => parseInt(id, 10));
            const isCompleted = completedIds.includes(parseInt(l.lesson_id, 10));
            const isActive = l.sequence_no === currentLesson.sequence_no;

            return `
                <li class="curriculum-lesson-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" data-seq="${l.sequence_no}">
                    <div class="lesson-check-circle">${isCompleted ? '✓' : l.sequence_no}</div>
                    <div class="curriculum-lesson-details">
                        <div class="title">${l.lesson_title}</div>
                        <div class="duration">⏱️ ${l.duration || '20 mins'}</div>
                    </div>
                </li>
            `;
        }).join('');

        sidebarList.querySelectorAll('.curriculum-lesson-item').forEach(item => {
            item.addEventListener('click', () => {
                const seq = parseInt(item.getAttribute('data-seq'), 10);
                switchLesson(seq);
            });
        });
    }

    function renderCurrentLesson() {
        const titleEl = document.getElementById('activeLessonTitle');
        if (titleEl) titleEl.textContent = `${currentLesson.sequence_no}. ${currentLesson.lesson_title}`;

        const breadcrumbEl = document.getElementById('activeLessonBreadcrumb');
        if (breadcrumbEl) breadcrumbEl.textContent = `${course.title} • Module ${currentLesson.sequence_no} of ${lessons.length}`;

        const contentEl = document.getElementById('lessonNotesContent');
        if (contentEl) {
            contentEl.innerHTML = `
                <h3 style="margin-bottom:12px; color:var(--navy-900);">Module Overview & Architecture Notes</h3>
                <p style="font-size:1.05rem; line-height:1.7; color:var(--text-secondary); margin-bottom:20px;">
                    ${currentLesson.content || 'Follow along with the lecture notes and practical coding implementation demonstrated in this module.'}
                </p>
                <div style="background:#f1f5f9; padding:20px; border-radius:12px; border-left:4px solid var(--purple-600);">
                    <h4 style="margin-bottom:6px; color:var(--navy-900);">💡 Learning Tip:</h4>
                    <p style="font-size:0.92rem; color:var(--text-muted); margin:0;">
                        Write out your SQL schema queries and Express route controllers in VS Code to solidify your architectural understanding.
                    </p>
                </div>
            `;
        }

        // Toggle Mark Complete Button State
        const completeBtn = document.getElementById('toggleCompleteLessonBtn');
        if (completeBtn) {
            if (!canTrackProgress) {
                completeBtn.disabled = true;
                completeBtn.textContent = 'Student progress only';
                completeBtn.className = 'btn btn-secondary btn-sm';
            }
            const completedIds = (enrollment.completed_lessons || []).map((id) => parseInt(id, 10));
            const isCompleted = canTrackProgress && completedIds.includes(parseInt(currentLesson.lesson_id, 10));
            completeBtn.disabled = !canTrackProgress;
            if (!canTrackProgress) {
                completeBtn.textContent = 'Student progress only';
            } else if (isCompleted) {
                completeBtn.textContent = '✓ Completed (Click to Undo)';
                completeBtn.className = 'btn btn-secondary btn-sm';
            } else {
                completeBtn.textContent = 'Mark as Completed';
                completeBtn.className = 'btn btn-primary btn-sm';
            }
        }

        // Prev & Next Buttons
        const prevBtn = document.getElementById('prevLessonBtn');
        const nextBtn = document.getElementById('nextLessonBtn');

        if (prevBtn) {
            prevBtn.disabled = currentLesson.sequence_no <= 1;
            prevBtn.onclick = () => switchLesson(currentLesson.sequence_no - 1);
        }

        if (nextBtn) {
            nextBtn.disabled = currentLesson.sequence_no >= lessons.length;
            nextBtn.onclick = () => switchLesson(currentLesson.sequence_no + 1);
        }

        renderProgress();
        renderCurriculumSidebar();
    }

    function switchLesson(seq) {
        const found = lessons.find(l => l.sequence_no === seq);
        if (found) {
            currentLesson = found;
            window.history.replaceState({}, '', `/lesson.html?course_id=${courseId}&lesson=${seq}`);
            renderCurrentLesson();
        }
    }

    // Toggle Complete Button
    const completeBtn = document.getElementById('toggleCompleteLessonBtn');
    if (completeBtn) {
        completeBtn.addEventListener('click', async () => {
            if (!canTrackProgress) return;

            const isCurrentlyCompleted = enrollment && enrollment.completed_lessons && enrollment.completed_lessons.includes(currentLesson.lesson_id);
            const newState = !isCurrentlyCompleted;

            completeBtn.disabled = true;
            const progressRes = await apiRequest('/enrollments/progress', 'POST', {
                course_id: courseId,
                lesson_id: currentLesson.lesson_id,
                is_completed: newState
            });
            completeBtn.disabled = false;

            if (!progressRes.success) {
                alert(progressRes.message || 'Could not update your course progress.');
                return;
            }

            enrollment.completed_lessons = (progressRes.completed_lessons || []).map((id) => parseInt(id, 10));
            enrollment.progress = progressRes.progress;
            enrollment.status = progressRes.status;
            enrollment.completed_count = progressRes.completed_count;
            enrollment.total_lessons = progressRes.total_lessons;
            renderCurrentLesson();
        });
    }

    // Tabs switcher
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.add('d-none'));

            btn.classList.add('active');
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.classList.remove('d-none');
        });
    });

    renderCurrentLesson();
});
