/* =========================================================
   Online Course Learning Management System - Courses Logic
   Project Owner: Lokesh Yadav
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
    const catalogGrid = document.getElementById('catalogCoursesGrid');
    const featuredGrid = document.getElementById('featuredCoursesGrid');
    const searchInput = document.getElementById('courseSearchInput');
    const filterPillsContainer = document.getElementById('categoryFilterPills');

    let currentCategory = 'All';
    let allCoursesList = [];

    // Helper to generate attractive course card HTML
    const renderCourseCard = (c) => `
        <div class="course-card">
            <div class="course-banner" style="background: ${c.banner_color || 'var(--purple-gradient)'};">
                <span class="course-banner-icon">${c.icon || '💻'}</span>
            </div>
            <div class="course-card-body">
                <div class="course-meta">
                    <span class="badge badge-purple">${c.category || 'Technology'}</span>
                    <span style="font-size:0.85rem; color:#f59e0b; font-weight:700;">★ 4.9</span>
                </div>
                <h3><a href="/course-details.html?id=${c.course_id}">${c.title}</a></h3>
                <p>${c.description ? (c.description.length > 95 ? c.description.substring(0, 95) + '...' : c.description) : 'Interactive curriculum with practical exercises.'}</p>
                
                <div class="course-stats-line">
                    <span>👨‍🏫 Instructor: Lokesh Yadav</span>
                    <span>•</span>
                    <span>📚 ${c.total_lessons !== undefined ? c.total_lessons : (c.lessons ? c.lessons.length : 3)} Lessons</span>
                </div>

                <div class="course-card-footer">
                    <span class="course-price">$${parseFloat(c.price || 49.99).toFixed(2)}</span>
                    <a href="/course-details.html?id=${c.course_id}" class="btn btn-outline-purple btn-sm">View Syllabus</a>
                </div>
            </div>
        </div>
    `;

    // Load Courses Catalog
    async function loadAllCourses() {
        const res = await apiRequest('/courses');
        if (res.success && res.data) {
            allCoursesList = res.data;
            applyFilters();
        }
    }

    function applyFilters() {
        const target = catalogGrid || featuredGrid;
        if (!target) return;

        let filtered = allCoursesList;

        // Apply Category Filter
        if (currentCategory !== 'All') {
            filtered = filtered.filter(c => 
                (c.category && c.category.toLowerCase().includes(currentCategory.toLowerCase())) ||
                c.title.toLowerCase().includes(currentCategory.toLowerCase())
            );
        }

        // Apply Search Filter
        if (searchInput && searchInput.value.trim()) {
            const term = searchInput.value.toLowerCase().trim();
            filtered = filtered.filter(c => 
                c.title.toLowerCase().includes(term) || 
                (c.description && c.description.toLowerCase().includes(term))
            );
        }

        if (filtered.length > 0) {
            target.innerHTML = filtered.map(renderCourseCard).join('');
        } else {
            target.innerHTML = `
                <div style="grid-column: 1/-1; padding: 50px 20px; text-align: center; background: #ffffff; border-radius: 16px; border: 1px solid var(--card-border);">
                    <div style="font-size: 2.8rem; margin-bottom: 12px;">🔍</div>
                    <h3>No courses found matching "${searchInput ? searchInput.value : ''}"</h3>
                    <p class="text-muted">Try adjusting your keyword search or category filter.</p>
                </div>
            `;
        }
    }

    // Bind Search Input with debouncing
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(applyFilters, 300);
        });
    }

    // Bind Category Filter Pills
    if (filterPillsContainer) {
        const pills = filterPillsContainer.querySelectorAll('.filter-pill');
        pills.forEach(p => {
            p.addEventListener('click', () => {
                pills.forEach(other => other.classList.remove('active'));
                p.classList.add('active');
                currentCategory = p.getAttribute('data-category') || 'All';
                applyFilters();
            });
        });
    }

    if (catalogGrid || featuredGrid) {
        loadAllCourses();
    }

    // =========================================================
    // Course Details Page Loader & Enrollment State
    // =========================================================
    const detailContainer = document.getElementById('courseDetailContainer');
    if (detailContainer) {
        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('id') || '1';
        loadCourseDetails(courseId);
    }

    async function loadCourseDetails(id) {
        const res = await apiRequest(`/courses/${id}`);
        if (!res.success || !res.data) return;

        const c = res.data;
        document.title = `${c.title} | Online Course LMS`;

        const badge = document.getElementById('courseDetailCategory');
        if (badge) badge.textContent = c.category || 'Engineering';

        const title = document.getElementById('courseDetailTitle');
        if (title) title.textContent = c.title;

        const desc = document.getElementById('courseDetailDesc');
        if (desc) desc.textContent = c.description;

        const instName = document.getElementById('courseInstructorName');
        if (instName) instName.textContent = c.instructor_name || 'Lokesh Yadav';

        const price = document.getElementById('courseDetailPrice');
        if (price) price.textContent = `$${parseFloat(c.price || 49.99).toFixed(2)}`;

        const lessonCount = document.getElementById('courseDetailLessonCount');
        const count = c.total_lessons || (c.lessons ? c.lessons.length : 0);
        if (lessonCount) lessonCount.textContent = `${count} Lessons`;

        const isEnrolled = !!c.is_enrolled;

        const syllabusList = document.getElementById('courseSyllabusList');
        const enrollBtn = document.getElementById('enrollCourseBtn');

        if (syllabusList) {
            if (isEnrolled && c.lessons && c.lessons.length > 0) {
                // UNLOCKED: Show full lesson list
                syllabusList.innerHTML = c.lessons.map(lesson => `
                    <div class="syllabus-item" style="cursor:pointer;" onclick="window.location.href='/lesson.html?course_id=${id}&lesson=${lesson.sequence_no}'">
                        <div class="syllabus-left">
                            <div class="syllabus-index">${lesson.sequence_no}</div>
                            <div>
                                <div class="syllabus-title" style="color:var(--navy-900); font-weight:700;">
                                    ${lesson.lesson_title}
                                </div>
                                <span class="text-muted" style="font-size:0.83rem;">
                                    ${lesson.video_url ? '🎬 HD Video Lecture' : '📄 Reading Material'} • Click to Open
                                </span>
                            </div>
                        </div>
                        <a href="/lesson.html?course_id=${id}&lesson=${lesson.sequence_no}" class="btn btn-outline-purple btn-sm">
                            Open Lesson ▶
                        </a>
                    </div>
                `).join('');
            } else if (!isEnrolled) {
                // LOCKED: Only visible after enrollment as specified
                syllabusList.innerHTML = `
                    <div style="background:var(--purple-50); border:1.5px dashed var(--purple-300); border-radius:14px; padding:30px 20px; text-align:center;">
                        <div style="font-size:2.2rem; margin-bottom:8px;">🔒</div>
                        <h4 style="margin:0 0 6px; color:var(--navy-900);">Curriculum Locked to Enrolled Students</h4>
                        <p style="color:var(--text-muted); font-size:0.92rem; max-width:440px; margin:0 auto 18px;">
                            Students can view the complete lesson list, stream high-definition lectures, and download exercises immediately upon enrollment.
                        </p>
                        <button class="btn btn-primary btn-sm" onclick="document.getElementById('enrollCourseBtn').click()">
                            Enroll Now to Unlock All ${count} Lessons
                        </button>
                    </div>
                `;
            } else {
                syllabusList.innerHTML = '<p class="text-muted" style="padding:15px;">No lessons published for this course yet.</p>';
            }
        }

        if (enrollBtn) {
            if (isEnrolled) {
                enrollBtn.textContent = '🚀 Go to Classroom & Lessons';
                enrollBtn.className = 'btn btn-primary btn-large btn-block';
                enrollBtn.onclick = () => {
                    window.location.href = `/lesson.html?course_id=${id}&lesson=1`;
                };
            } else {
                enrollBtn.textContent = 'Enroll in Course Now';
                enrollBtn.className = 'btn btn-primary btn-large btn-block';
                enrollBtn.onclick = async () => {
                    if (!Auth.isAuthenticated()) {
                        sessionStorage.setItem('redirect_after_login', window.location.href);
                        window.location.href = '/login.html';
                        return;
                    }

                    enrollBtn.disabled = true;
                    enrollBtn.textContent = 'Processing Enrollment...';

                    const enrollRes = await apiRequest('/enrollments', 'POST', { course_id: parseInt(id, 10) });
                    if (enrollRes.success) {
                        const enrolledOn = enrollRes.data && enrollRes.data.enrollment_date ? ` on ${enrollRes.data.enrollment_date}` : '';
                        alert(`You are enrolled in "${c.title}"${enrolledOn}. Opening classroom...`);
                        window.location.href = `/lesson.html?course_id=${id}&lesson=1`;
                        return;
                    }

                    enrollBtn.disabled = false;
                    enrollBtn.textContent = 'Enroll in Course Now';
                    if (enrollRes.status === 409) {
                        alert(enrollRes.message || 'Already enrolled in this course');
                        loadCourseDetails(id);
                        return;
                    }
                    alert(enrollRes.message || 'Unable to enroll in this course.');
                };
            }
        }
    }
});
