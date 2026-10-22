/**
 * Presentation Interactive Script
 * Keyboard navigation, Presenter Notes, Timer, Interactive Scorecard, Dark Mode, Sound Effects
 */

document.addEventListener('DOMContentLoaded', () => {
    const snapContainer = document.querySelector('.snap-container');
    const slides = Array.from(document.querySelectorAll('.slide-section'));
    const sideNavItems = Array.from(document.querySelectorAll('.side-number-item'));
    const currentSlideNumEl = document.getElementById('currentSlideNum');
    const totalSlideNumEl = document.getElementById('totalSlideNum');
    const scrollProgressBar = document.getElementById('scrollProgressBar');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const presenterNotesBtn = document.getElementById('presenterNotesBtn');
    const presenterModal = document.getElementById('presenterModal');
    const closePresenterBtn = document.getElementById('closePresenterBtn');
    const prevSlideBtn = document.getElementById('prevSlideBtn');
    const nextSlideBtn = document.getElementById('nextSlideBtn');
    const timerDisplay = document.getElementById('timerDisplay');
    const timerToggleBtn = document.getElementById('timerToggleBtn');

    let currentSlideIndex = 0;
    const totalSlides = slides.length;
    if (totalSlideNumEl) totalSlideNumEl.textContent = totalSlides.toString().padStart(2, '0');

    // 1. Navigation to specific slide
    function goToSlide(index) {
        if (index < 0) index = 0;
        if (index >= totalSlides) index = totalSlides - 1;
        currentSlideIndex = index;
        slides[index].scrollIntoView({ behavior: 'smooth' });
        updateUI();
    }

    // 2. Update UI indicators (dots, progress bar, counter)
    function updateUI() {
        if (currentSlideNumEl) {
            currentSlideNumEl.textContent = (currentSlideIndex + 1).toString().padStart(2, '0');
        }

        // Side dot active state
        sideNavItems.forEach((item, idx) => {
            if (idx === currentSlideIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Slides active class (triggers CSS animations)
        slides.forEach((slide, idx) => {
            if (idx === currentSlideIndex) {
                slide.classList.add('active');
            } else {
                slide.classList.remove('active');
            }
        });

        // Progress bar
        if (scrollProgressBar && totalSlides > 1) {
            const pct = (currentSlideIndex / (totalSlides - 1)) * 100;
            scrollProgressBar.style.width = `${pct}%`;
        }

        // Update presenter notes if modal is open
        updatePresenterModalContent();
    }

    // 3. Intersection Observer to detect active slide during smooth scroll/touch
    const observerOptions = {
        root: snapContainer,
        threshold: 0.55
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const index = slides.indexOf(entry.target);
                if (index !== -1 && index !== currentSlideIndex) {
                    currentSlideIndex = index;
                    updateUI();
                }
            }
        });
    }, observerOptions);

    slides.forEach(slide => observer.observe(slide));

    // 4. Click Events for Side Nav Dots
    sideNavItems.forEach((item) => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetIndex = parseInt(item.getAttribute('data-index'), 10);
            goToSlide(targetIndex);
        });
    });

    // 5. Next & Prev Buttons
    if (prevSlideBtn) {
        prevSlideBtn.addEventListener('click', () => goToSlide(currentSlideIndex - 1));
    }
    if (nextSlideBtn) {
        nextSlideBtn.addEventListener('click', () => goToSlide(currentSlideIndex + 1));
    }

    // 6. Keyboard Navigation
    document.addEventListener('keydown', (e) => {
        // Ignore if user is typing in an input
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

        switch (e.key) {
            case 'ArrowDown':
            case 'ArrowRight':
            case 'PageDown':
            case ' ':
                e.preventDefault();
                goToSlide(currentSlideIndex + 1);
                break;
            case 'ArrowUp':
            case 'ArrowLeft':
            case 'PageUp':
                e.preventDefault();
                goToSlide(currentSlideIndex - 1);
                break;
            case 'Home':
                e.preventDefault();
                goToSlide(0);
                break;
            case 'End':
                e.preventDefault();
                goToSlide(totalSlides - 1);
                break;
            case 'p':
            case 'P':
                e.preventDefault();
                togglePresenterModal();
                break;
            case 't':
            case 'T':
                e.preventDefault();
                toggleTheme();
                break;
            case 'f':
            case 'F':
                e.preventDefault();
                toggleFullScreen();
                break;
            case 'Escape':
                if (presenterModal && presenterModal.classList.contains('show')) {
                    presenterModal.classList.remove('show');
                }
                break;
        }
    });

    // 7. Dark Mode Toggle
    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('presentation-theme', isDark ? 'dark' : 'light');
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = isDark 
                ? '<i class="bi bi-sun-fill text-warning"></i><span>Light</span>' 
                : '<i class="bi bi-moon-stars-fill"></i><span>Dark</span>';
        }
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
    // Check saved theme
    if (localStorage.getItem('presentation-theme') === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = '<i class="bi bi-sun-fill text-warning"></i><span>Light</span>';
        }
    }

    // 8. Fullscreen Toggle
    function toggleFullScreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn(`Fullscreen error: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
    const fullScreenBtn = document.getElementById('fullScreenBtn');
    if (fullScreenBtn) {
        fullScreenBtn.addEventListener('click', toggleFullScreen);
    }

    // 9. Presenter Notes Drawer / Modal
    function togglePresenterModal() {
        if (!presenterModal) return;
        presenterModal.classList.toggle('show');
        if (presenterModal.classList.contains('show')) {
            updatePresenterModalContent();
        }
    }

    function updatePresenterModalContent() {
        if (!presenterModal || !presenterModal.classList.contains('show')) return;
        const currentSlide = slides[currentSlideIndex];
        const speaker = currentSlide.getAttribute('data-speaker') || 'Cả Nhóm';
        const stageNote = currentSlide.getAttribute('data-stage-note') || 'Tự tin, giữ kết nối mắt với khán giả.';
        const speechScript = currentSlide.getAttribute('data-speech') || 'Trình bày theo nội dung hiển thị trên slide.';

        document.getElementById('modalSpeakerName').textContent = speaker;
        document.getElementById('modalSlideTitle').textContent = `Slide ${(currentSlideIndex + 1).toString().padStart(2, '0')}: ${currentSlide.getAttribute('data-title') || ''}`;
        document.getElementById('modalStageNote').textContent = stageNote;
        document.getElementById('modalSpeechScript').innerHTML = speechScript;
    }

    if (presenterNotesBtn) presenterNotesBtn.addEventListener('click', togglePresenterModal);
    if (closePresenterBtn) closePresenterBtn.addEventListener('click', () => presenterModal.classList.remove('show'));
    if (presenterModal) {
        presenterModal.addEventListener('click', (e) => {
            if (e.target === presenterModal) presenterModal.classList.remove('show');
        });
    }

    // 10. Presentation Timer (Counts up from 00:00 to 25:00)
    let timerSeconds = 0;
    let timerRunning = true;
    let timerInterval = setInterval(() => {
        if (timerRunning) {
            timerSeconds++;
            const mins = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
            const secs = (timerSeconds % 60).toString().padStart(2, '0');
            if (timerDisplay) timerDisplay.textContent = `${mins}:${secs}`;
            // If over 20 mins, turn warning color
            if (timerSeconds >= 1200 && timerDisplay) {
                timerDisplay.style.color = '#ef4444';
            }
        }
    }, 1000);

    if (timerToggleBtn) {
        timerToggleBtn.addEventListener('click', () => {
            timerRunning = !timerRunning;
            timerToggleBtn.innerHTML = timerRunning 
                ? '<i class="bi bi-pause-fill"></i>' 
                : '<i class="bi bi-play-fill"></i>';
        });
    }

    // 11. Interactive Offer Scorecard Calculator (Slide 11)
    const scoreSalary = document.getElementById('scoreSalary');
    const scoreMentor = document.getElementById('scoreMentor');
    const scoreLearning = document.getElementById('scoreLearning');
    const scoreCulture = document.getElementById('scoreCulture');
    const totalScoreDisplay = document.getElementById('totalOfferScore');
    const offerRecommendation = document.getElementById('offerRecommendation');

    function calculateOfferScore() {
        if (!scoreSalary || !scoreMentor || !scoreLearning || !scoreCulture) return;
        const vSalary = parseInt(scoreSalary.value, 10);
        const vMentor = parseInt(scoreMentor.value, 10);
        const vLearning = parseInt(scoreLearning.value, 10);
        const vCulture = parseInt(scoreCulture.value, 10);

        document.getElementById('valSalary').textContent = `${vSalary}/30`;
        document.getElementById('valMentor').textContent = `${vMentor}/30`;
        document.getElementById('valLearning').textContent = `${vLearning}/25`;
        document.getElementById('valCulture').textContent = `${vCulture}/15`;

        const total = vSalary + vMentor + vLearning + vCulture;
        if (totalScoreDisplay) totalScoreDisplay.textContent = `${total}/100`;

        let recText = '';
        let badgeClass = '';
        if (total >= 80) {
            recText = '🚀 XUẤT SẮC: Offer vàng! Môi trường bứt phá sự nghiệp, nên ký ngay!';
            badgeClass = 'bg-success text-white';
        } else if (total >= 60) {
            recText = '⚖️ TẠM ỔN: Cân nhắc kỹ, thương lượng thêm về lộ trình đào tạo và mentor.';
            badgeClass = 'bg-warning text-dark';
        } else {
            recText = '⚠️ CẢNH BÁO: Điểm quá thấp! Nguy cơ bẫy lương cao việc lặp lại hoặc bóc lột!';
            badgeClass = 'bg-danger text-white';
        }

        if (offerRecommendation) {
            offerRecommendation.textContent = recText;
            offerRecommendation.className = `p-2 px-3 rounded-pill fw-bold small ${badgeClass}`;
        }
    }

    [scoreSalary, scoreMentor, scoreLearning, scoreCulture].forEach(slider => {
        if (slider) slider.addEventListener('input', calculateOfferScore);
    });

    // 12. Accordion for Q&A questions (Slide 12 & 13)
    document.querySelectorAll('.qna-header-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.qna-accordion-item');
            if (item) {
                item.classList.toggle('open');
            }
        });
    });

    // Init UI
    goToSlide(0);
    calculateOfferScore();
});
