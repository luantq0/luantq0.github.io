// ============================================
// CONSTANTS & CONFIGURATION
// ============================================
const CONFIG = {
    postsFile: 'posts/index.txt',
    categories: ['ctf', 'blogs', 'research'],
    defaultLanguage: 'c',
    dateFormat: { year: 'numeric', month: 'short', day: 'numeric' }
};

const STATE = {
    posts: [],
    currentCategory: 'all',
    currentYear: 'all',
    currentMonth: 'all'
};

// ============================================
// DOM CACHE
// ============================================
const DOM = (() => {
    const cache = {};
    const ids = [
        'postsList', 'postContent', 'articleContent',
        'backBtn', 'searchInput', 'themeToggle', 'homeLink',
        'yearFilter', 'monthFilter', 'clearFilters', 'menuBtn'
    ];

    ids.forEach(id => cache[id] = document.getElementById(id));
    cache.navLinks = document.querySelectorAll('.nav-links a');
    cache.navLinksMenu = document.querySelector('.nav-links');
    cache.header = document.querySelector('header');
    
    return cache;
})();

// ============================================
// ROUTER MODULE
// ============================================
const Router = {
    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute();
    },

    handleRoute() {
        const path = this.getCleanPath();
        const route = this.detectRoute(path);
        this.navigate(route);
    },

    getCleanPath() {
        return window.location.hash.slice(1).replace(/^\/+|\/+$/g, '');
    },

    detectRoute(path) {
        if (!path) return { type: 'home' };
        if (path === 'about') return { type: 'about' };
        if (path.endsWith('.md')) return { type: 'post', path: this.normalizePath(path) };
        if (CONFIG.categories.includes(path)) return { type: 'category', category: path };
        if (path.includes('/')) return { type: 'post', path: this.normalizePath(path) };
        return { type: 'home' };
    },

    normalizePath(path) {
        // Add 'posts/' at the beginning if it's not already there
        return path.startsWith('posts/') ? path : 'posts/' + path;
    },

    navigate(route) {
        switch(route.type) {
            case 'post':
                PostView.load(route.path);
                break;
            case 'category':
                CategoryView.filter(route.category);
                break;
            case 'about':
                AboutView.show();
                break;
            default:
                HomeView.show();
        }
    },

    updateURL(path) {
        // Remove 'posts/' from the displayed URL
        const displayPath = path.replace(/^posts\//, '');
        window.location.hash = displayPath;
    }
};

// ============================================
// DATA MODULE
// ============================================
const DataManager = {
    async loadPosts() {
        try {
            const response = await fetch(CONFIG.postsFile);
            if (!response.ok) throw new Error('Failed to load posts');
            
            STATE.posts = await response.json();
            this.sortByDate();
            TimeFilter.populateYears(); // Populate years after posts are loaded
            Router.handleRoute();
        } catch (error) {
            console.error('Load posts error:', error);
            UI.showError('Failed to load posts');
        }
    },

    sortByDate() {
        STATE.posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    findPost(filePath) {
        return STATE.posts.find(p => p.file === filePath);
    },

    filterPosts(category, searchTerm, year, month) {
        let filtered = STATE.posts;

        if (category !== 'all') {
            filtered = filtered.filter(p => p.category === category);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(p => 
                p.title.toLowerCase().includes(term) ||
                p.description.toLowerCase().includes(term)
            );
        }

        if (year !== 'all') {
            filtered = filtered.filter(p => {
                const postYear = new Date(p.date).getFullYear().toString();
                return postYear === year;
            });
        }

        if (month !== 'all' && year !== 'all') {
            filtered = filtered.filter(p => {
                const postDate = new Date(p.date);
                const postMonth = (postDate.getMonth() + 1).toString().padStart(2, '0');
                return postMonth === month;
            });
        }

        return filtered;
    },

    getAvailableYears() {
        const years = [...new Set(STATE.posts.map(p => 
            new Date(p.date).getFullYear()
        ))].sort((a, b) => b - a);
        return years;
    },

    getAvailableMonths(year) {
        if (year === 'all') return [];
        
        const months = [...new Set(STATE.posts
            .filter(p => new Date(p.date).getFullYear().toString() === year)
            .map(p => new Date(p.date).getMonth() + 1)
        )].sort((a, b) => b - a);
        
        return months;
    }
};

// ============================================
// VIEW MODULES
// ============================================
const HomeView = {
    show() {
        UI.showPostsList();
        this.resetFilters();
        this.displayPosts(STATE.posts);
    },

    resetFilters() {
        DOM.navLinks.forEach(link => link.classList.remove('active'));
        STATE.currentCategory = 'all';
        STATE.currentYear = 'all';
        STATE.currentMonth = 'all';
        DOM.searchInput.value = '';
        DOM.yearFilter.value = 'all';
        DOM.monthFilter.value = 'all';
        DOM.monthFilter.disabled = true;
        DOM.clearFilters.style.display = 'none';
    },

    displayPosts(posts) {
        if (posts.length === 0) {
            DOM.postsList.innerHTML = '<div class="no-posts">No articles found</div>';
            return;
        }

        const html = posts.map(post => this.createPostCard(post)).join('');
        DOM.postsList.innerHTML = html;
        this.attachPostHandlers();
    },

    createPostCard(post) {
        // Remove 'posts/' from data-file for a shorter URL
        const displayFile = post.file.replace(/^posts\//, '');
        const tagsHtml = post.tags ? post.tags.map(tag => 
            `<span class="tag-badge">${tag}</span>`
        ).join('') : '';
        
        return `
            <div class="post-card" data-file="${displayFile}">
                <div class="post-info">
                    <div class="post-header">
                        <span class="category-badge ${post.category}">${post.category.toUpperCase()}</span>
                        <span class="post-date">${Helpers.formatDate(post.date)}</span>
                    </div>
                    <h3>${post.title}</h3>
                    <p class="post-description">${post.description}</p>
                    ${tagsHtml ? `<div class="post-tags">${tagsHtml}</div>` : ''}
                </div>
            </div>
        `;
    },

    attachPostHandlers() {
        DOM.postsList.querySelectorAll('.post-card').forEach(card => {
            card.addEventListener('click', () => {
                Router.updateURL(card.dataset.file);
            });
        });
    }
};

const PostView = {
    async load(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error('Post not found');

            const markdown = await response.text();
            const html = marked.parse(markdown);

            DOM.articleContent.innerHTML = html;
            this.highlightCode();
            UI.showArticle();
            this.updateTitle(filePath);
        } catch (error) {
            console.error('Load post error:', error);
            this.show404();
        }
    },

    highlightCode() {
        DOM.articleContent.querySelectorAll('pre code').forEach(block => {
            const match = block.className.match(/language-(\w+)/);
            if (!match) block.classList.add(`language-${CONFIG.defaultLanguage}`);
            Prism.highlightElement(block);
        });
        this.addCopyButtons();
    },

    addCopyButtons() {
        DOM.articleContent.querySelectorAll('pre').forEach(pre => {
            if (pre.querySelector('.copy-btn')) return;

            pre.style.position = 'relative';

            const btn = document.createElement('button');
            btn.className = 'copy-btn';
            btn.setAttribute('aria-label', 'Copy code');
            btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>`;

            btn.addEventListener('click', () => {
                const code = pre.querySelector('code');
                const text = code ? code.innerText : pre.innerText;
                navigator.clipboard.writeText(text).then(() => {
                    btn.classList.add('copied');
                    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>`;
                    setTimeout(() => {
                        btn.classList.remove('copied');
                        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>`;
                    }, 2000);
                }).catch(() => {
                    // Fallback for older browsers
                    const ta = document.createElement('textarea');
                    ta.value = text;
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                });
            });

            pre.appendChild(btn);
        });
    },

    updateTitle(filePath) {
        const post = DataManager.findPost(filePath);
        document.title = post 
            ? `${post.title} - LuanTran's Blog`
            : "LuanTran's Blog";
    },

    show404() {
        DOM.articleContent.innerHTML = `
            <h1>404 - Post Not Found</h1>
            <p>The requested post could not be found.</p>
        `;
        UI.showArticle();
    }
};

const CategoryView = {
    filter(category) {
        STATE.currentCategory = category;
        this.updateActiveNav(category);
        UI.showPostsList();
        this.applyFilters();
    },

    updateActiveNav(category) {
        DOM.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.category === category);
        });
    },

    applyFilters() {
        const searchTerm = DOM.searchInput.value;
        const filtered = DataManager.filterPosts(
            STATE.currentCategory, 
            searchTerm,
            STATE.currentYear,
            STATE.currentMonth
        );
        HomeView.displayPosts(filtered);
        this.updateClearButton();
    },

    updateClearButton() {
        const hasFilters = STATE.currentYear !== 'all' || 
                          STATE.currentMonth !== 'all' || 
                          DOM.searchInput.value !== '';
        DOM.clearFilters.style.display = hasFilters ? 'inline-block' : 'none';
    }
};

const AboutView = {
    async show() {
        this.updateActiveNav();
        try {
            const response = await fetch('about.md');
            if (!response.ok) throw new Error('About page not found');
            const markdown = await response.text();
            DOM.articleContent.innerHTML = marked.parse(markdown);
            PostView.highlightCode();
        } catch (error) {
            DOM.articleContent.innerHTML = '<h1>About</h1><p>Content coming soon.</p>';
        }
        UI.showArticle();
        document.title = "About - LuanTran's Blog";
    },

    updateActiveNav() {
        DOM.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.page === 'about');
        });
    }
};

// ============================================
// UI MODULE
// ============================================
const UI = {
    showPostsList() {
        DOM.postContent.style.display = 'none';
        DOM.postsList.style.display = 'flex';
        document.title = "LuanTran's Blog";
    },

    showArticle() {
        DOM.postsList.style.display = 'none';
        DOM.postContent.style.display = 'block';
        window.scrollTo(0, 0);
    },

    showError(message) {
        DOM.postsList.innerHTML = `<div class="no-posts">${message}</div>`;
    }
};

// ============================================
// TIME FILTER MODULE
// ============================================
const TimeFilter = {
    monthNames: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ],

    populateYears() {
        if (!STATE.posts || STATE.posts.length === 0) {
            console.warn('No posts available for year filter');
            return;
        }

        const years = DataManager.getAvailableYears();
        console.log('Available years:', years);
        
        const options = years.map(year => 
            `<option value="${year}">${year}</option>`
        ).join('');
        
        // Keep "All years" and add year options
        DOM.yearFilter.innerHTML = '<option value="all">All years</option>' + options;
    },

    updateMonthFilter(year) {
        // Always reset month state when year changes
        STATE.currentMonth = 'all';
        
        if (year === 'all') {
            DOM.monthFilter.innerHTML = '<option value="all">All months</option>';
            DOM.monthFilter.disabled = true;
            return;
        }

        const months = DataManager.getAvailableMonths(year);
        console.log('Available months for', year, ':', months);
        
        const options = months.map(month => {
            const monthStr = month.toString().padStart(2, '0');
            return `<option value="${monthStr}">${this.monthNames[month - 1]}</option>`;
        }).join('');

        DOM.monthFilter.innerHTML = '<option value="all">All months</option>' + options;
        DOM.monthFilter.disabled = false;
        DOM.monthFilter.value = 'all';
    }
};

// ============================================
// THEME MODULE
// ============================================
const ThemeManager = {
    init() {
        this.applyInitialTheme();
        DOM.themeToggle.addEventListener('click', () => this.toggle());
    },

    applyInitialTheme() {
        if (document.documentElement.classList.contains('dark-mode')) {
            document.body.classList.add('dark-mode');
            document.documentElement.classList.remove('dark-mode');
        }
    },

    toggle() {
        document.body.classList.toggle('dark-mode');
        this.save();
    },

    save() {
        try {
            const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            localStorage.setItem('theme', theme);
        } catch (e) {
            console.warn('Could not save theme:', e);
        }
    }
};

// ============================================
// EVENT HANDLERS MODULE
// ============================================
const EventHandlers = {
    init() {
        this.setupNavigation();
        this.setupSearch();
        this.setupTimeFilters();
        this.setupMobileMenu();
    },

    closeMobileMenu() {
        DOM.navLinksMenu.classList.remove('open');
        DOM.menuBtn.classList.remove('open');
        DOM.menuBtn.setAttribute('aria-expanded', 'false');
    },

    setupMobileMenu() {
        DOM.menuBtn.addEventListener('click', () => {
            const isOpen = DOM.navLinksMenu.classList.toggle('open');
            DOM.menuBtn.classList.toggle('open', isOpen);
            DOM.menuBtn.setAttribute('aria-expanded', String(isOpen));
        });

        // Close menu when any nav link is clicked
        DOM.navLinks.forEach(link => {
            link.addEventListener('click', () => this.closeMobileMenu());
        });

        // Close menu when clicking outside the header
        document.addEventListener('click', (e) => {
            if (!e.target.closest('header')) this.closeMobileMenu();
        });
    },

    setupNavigation() {
        DOM.homeLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.closeMobileMenu();
            Router.updateURL('');
        });

        DOM.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const category = e.target.dataset.category;
                const page = e.target.dataset.page;
                if (page) {
                    Router.updateURL(page);
                } else if (category) {
                    Router.updateURL(category === 'all' ? '' : category);
                }
            });
        });

        DOM.backBtn.addEventListener('click', () => {
            window.history.back();
        });
    },

    setupSearch() {
        DOM.searchInput.addEventListener('input', () => {
            CategoryView.applyFilters();
        });
    },

    setupTimeFilters() {
        // Year filter change
        DOM.yearFilter.addEventListener('change', (e) => {
            STATE.currentYear = e.target.value;
            TimeFilter.updateMonthFilter(e.target.value);
            CategoryView.applyFilters();
        });

        // Month filter change
        DOM.monthFilter.addEventListener('change', (e) => {
            STATE.currentMonth = e.target.value;
            CategoryView.applyFilters();
        });

        // Clear filters button
        DOM.clearFilters.addEventListener('click', () => {
            STATE.currentYear = 'all';
            STATE.currentMonth = 'all';
            DOM.searchInput.value = '';
            DOM.yearFilter.value = 'all';
            DOM.monthFilter.value = 'all';
            DOM.monthFilter.disabled = true;
            CategoryView.applyFilters();
        });
    },

};

// ============================================
// HELPERS MODULE
// ============================================
const Helpers = {
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', CONFIG.dateFormat);
    }
};

// ============================================
// APP INITIALIZATION
// ============================================
const App = {
    init() {
        ThemeManager.init();
        DataManager.loadPosts();
        Router.init();
        EventHandlers.init();
    }
};

// Start the application
document.addEventListener('DOMContentLoaded', () => App.init());