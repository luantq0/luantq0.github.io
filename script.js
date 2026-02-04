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
    currentCategory: 'all'
};

// ============================================
// DOM CACHE
// ============================================
const DOM = (() => {
    const cache = {};
    const ids = [
        'postsList', 'postContent', 'articleContent', 
        'backBtn', 'searchInput', 'themeToggle', 'homeLink'
    ];
    
    ids.forEach(id => cache[id] = document.getElementById(id));
    cache.navLinks = document.querySelectorAll('.nav-links a');
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
        if (path.endsWith('.md')) return { type: 'post', path: this.normalizePath(path) };
        if (CONFIG.categories.includes(path)) return { type: 'category', category: path };
        if (path.includes('/')) return { type: 'post', path: this.normalizePath(path) };
        return { type: 'home' };
    },

    normalizePath(path) {
        // Thêm 'posts/' vào đầu nếu chưa có
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
            default:
                HomeView.show();
        }
    },

    updateURL(path) {
        // Loại bỏ 'posts/' khỏi URL hiển thị
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

    filterPosts(category, searchTerm) {
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

        return filtered;
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
        DOM.searchInput.value = '';
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
    },

    updateTitle(filePath) {
        const post = DataManager.findPost(filePath);
        document.title = post 
            ? `${post.title} - Luan Tran's Blog`
            : "Luan Tran's Blog";
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
        const filtered = DataManager.filterPosts(STATE.currentCategory, searchTerm);
        HomeView.displayPosts(filtered);
    }
};

// ============================================
// UI MODULE
// ============================================
const UI = {
    showPostsList() {
        DOM.postContent.style.display = 'none';
        DOM.postsList.style.display = 'flex';
        document.title = "Luan Tran's Blog";
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
        this.setupScroll();
    },

    setupNavigation() {
        DOM.homeLink.addEventListener('click', (e) => {
            e.preventDefault();
            Router.updateURL('');
        });

        DOM.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const category = e.target.dataset.category;
                Router.updateURL(category === 'all' ? '' : category);
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

    setupScroll() {
        let lastScroll = 0;
        
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            if (currentScroll <= 0) {
                DOM.header.classList.remove('hidden');
                return;
            }
            
            DOM.header.classList.toggle('hidden', 
                currentScroll > lastScroll && currentScroll > 100
            );
            
            lastScroll = currentScroll;
        });
    }
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