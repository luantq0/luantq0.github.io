// ============================================
// CONFIGURATION & STATE
// ============================================
let posts = [];
let currentCategory = 'all';

// ============================================
// DOM ELEMENTS
// ============================================
const DOM = {
    postsList: document.getElementById('postsList'),
    postContent: document.getElementById('postContent'),
    articleContent: document.getElementById('articleContent'),
    backBtn: document.getElementById('backBtn'),
    searchInput: document.getElementById('searchInput'),
    navLinks: document.querySelectorAll('.nav-links a'),
    themeToggle: document.getElementById('themeToggle'),
    homeLink: document.getElementById('homeLink'),
    header: document.querySelector('header')
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    loadPosts();
    setupEventListeners();
});

function initializeTheme() {
    // Transfer dark-mode class from html to body if needed
    if (document.documentElement.classList.contains('dark-mode')) {
        document.body.classList.add('dark-mode');
        document.documentElement.classList.remove('dark-mode');
    }
}

// ============================================
// DATA LOADING
// ============================================
async function loadPosts() {
    try {
        const response = await fetch('posts/index.txt');
        if (!response.ok) throw new Error('Failed to load posts index');
        
        posts = await response.json();
        
        // Sort by date (newest first)
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        displayPosts(posts);
    } catch (error) {
        console.error('Error loading posts:', error);
        DOM.postsList.innerHTML = '<div class="no-posts">Failed to load posts</div>';
    }
}

async function loadPost(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error('Failed to load article');
        
        const markdown = await response.text();
        const html = marked.parse(markdown);
        
        DOM.articleContent.innerHTML = html;
        
        // Apply syntax highlighting
        highlightCodeBlocks();
        
        // Show article, hide list
        showArticle();
        
    } catch (error) {
        DOM.articleContent.innerHTML = '<h1>Error</h1><p>Failed to load article. Please check the file path.</p>';
        showArticle();
    }
}

// ============================================
// SYNTAX HIGHLIGHTING
// ============================================
function highlightCodeBlocks() {
    DOM.articleContent.querySelectorAll('pre code').forEach((block) => {
        // Detect language from class name or default to 'c'
        const className = block.className;
        const match = className.match(/language-(\w+)/);
        
        if (match) {
            block.classList.add(`language-${match[1]}`);
        } else {
            block.classList.add('language-c');
        }
        
        // Apply Prism highlighting
        Prism.highlightElement(block);
    });
}

// ============================================
// UI UPDATES
// ============================================
function displayPosts(postsToDisplay) {
    if (postsToDisplay.length === 0) {
        DOM.postsList.innerHTML = '<div class="no-posts">No articles found</div>';
        return;
    }
    
    DOM.postsList.innerHTML = postsToDisplay.map(post => `
        <div class="post-card" onclick="loadPost('${post.file}')">
            <div class="post-info">
                <div class="post-header">
                    <span class="category-badge ${post.category}">${post.category.toUpperCase()}</span>
                    <span class="post-date">${formatDate(post.date)}</span>
                </div>
                <h3>${post.title}</h3>
                <p class="post-description">${post.description}</p>
            </div>
        </div>
    `).join('');
}

function showArticle() {
    DOM.postsList.style.display = 'none';
    DOM.postContent.style.display = 'block';
    window.scrollTo(0, 0);
}

function showPostsList() {
    DOM.postContent.style.display = 'none';
    DOM.postsList.style.display = 'flex';
}

function resetFilters() {
    DOM.navLinks.forEach(link => link.classList.remove('active'));
    currentCategory = 'all';
    DOM.searchInput.value = '';
}

// ============================================
// FILTERING & SEARCH
// ============================================
function filterPosts() {
    const searchTerm = DOM.searchInput.value.toLowerCase();
    let filtered = posts;
    
    // Filter by category
    if (currentCategory !== 'all') {
        filtered = filtered.filter(post => post.category === currentCategory);
    }
    
    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(post => 
            post.title.toLowerCase().includes(searchTerm) ||
            post.description.toLowerCase().includes(searchTerm)
        );
    }
    
    displayPosts(filtered);
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    setupThemeToggle();
    setupNavigation();
    setupSearch();
    setupScrollBehavior();
}

function setupThemeToggle() {
    DOM.themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        
        // Save theme preference
        try {
            const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            localStorage.setItem('theme', theme);
        } catch (e) {
            console.warn('Could not save theme preference:', e);
        }
    });
}

function setupNavigation() {
    // Home link
    DOM.homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        showPostsList();
        resetFilters();
        displayPosts(posts);
        window.scrollTo(0, 0);
    });

    // Category links
    DOM.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            DOM.navLinks.forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.dataset.category;
            filterPosts();
        });
    });

    // Back button
    DOM.backBtn.addEventListener('click', showPostsList);
}

function setupSearch() {
    DOM.searchInput.addEventListener('input', filterPosts);
}

function setupScrollBehavior() {
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        // Always show header at top
        if (currentScroll <= 0) {
            DOM.header.classList.remove('hidden');
            return;
        }
        
        // Hide on scroll down, show on scroll up
        if (currentScroll > lastScroll && currentScroll > 100) {
            DOM.header.classList.add('hidden');
        } else {
            DOM.header.classList.remove('hidden');
        }
        
        lastScroll = currentScroll;
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}