// Posts data
const posts = [
    // Research
    { 
        title: 'No data',
        category: 'research',
        file: 'posts/research/no_data.md',
        date: '2025-01-01',
        description: 'No data.'
    },


    // Blogs

    // CTF
    { 
        title: 'Scarlet CTF 2026 Writeup for ruid_login challenge',
        category: 'ctf',
        file: 'posts/ctf/Scarlet_CTF_2026/ruid_login.md',
        date: '2026-01-12',
        description: 'The challenge has buffer overflow and executable stack.'
    }

    { 
        title: 'CTF Challenge: Stack pivot exploit',
        category: 'ctf',
        file: 'posts/ctf/pwned/stack_pivot.md',
        date: '2026-01-12',
        description: 'The challenge has buffer overflow, modify rbp register, exploit stack pivot.'
    }
];

let currentCategory = 'all';

// DOM Elements
const postsList = document.getElementById('postsList');
const postContent = document.getElementById('postContent');
const articleContent = document.getElementById('articleContent');
const backBtn = document.getElementById('backBtn');
const searchInput = document.getElementById('searchInput');
const navLinks = document.querySelectorAll('.nav-links a');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Transfer dark-mode class from html to body if needed
    if (document.documentElement.classList.contains('dark-mode')) {
        document.body.classList.add('dark-mode');
        document.documentElement.classList.remove('dark-mode');
    }
    
    displayPosts(posts);
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        try {
            const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            localStorage.setItem('theme', theme);
        } catch (e) {
            console.warn('Could not save theme preference');
        }
    });

    // Home link
    document.getElementById('homeLink').addEventListener('click', (e) => {
        e.preventDefault();
        postContent.style.display = 'none';
        postsList.style.display = 'flex';
        navLinks.forEach(l => l.classList.remove('active'));
        currentCategory = 'all';
        searchInput.value = '';
        displayPosts(posts);
        window.scrollTo(0, 0);
    });

    // Category navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.dataset.category;
            filterPosts();
        });
    });

    // Search
    searchInput.addEventListener('input', filterPosts);

    // Back button
    backBtn.addEventListener('click', () => {
        postContent.style.display = 'none';
        postsList.style.display = 'flex';
    });

    // Header hide/show on scroll
    let lastScroll = 0;
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll <= 0) {
            header.classList.remove('hidden');
            return;
        }
        
        if (currentScroll > lastScroll && currentScroll > 100) {
            header.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
        }
        
        lastScroll = currentScroll;
    });
}

// Filter posts
function filterPosts() {
    const searchTerm = searchInput.value.toLowerCase();
    let filtered = posts;
    
    if (currentCategory !== 'all') {
        filtered = filtered.filter(post => post.category === currentCategory);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(post => 
            post.title.toLowerCase().includes(searchTerm) ||
            post.description.toLowerCase().includes(searchTerm)
        );
    }
    
    displayPosts(filtered);
}

// Display posts
function displayPosts(postsToDisplay) {
    if (postsToDisplay.length === 0) {
        postsList.innerHTML = '<div class="no-posts">No articles found</div>';
        return;
    }
    
    postsList.innerHTML = postsToDisplay.map(post => `
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

// Load post
async function loadPost(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error('Failed to load article');
        
        const markdown = await response.text();
        const html = marked.parse(markdown);
        
        articleContent.innerHTML = html;
        postsList.style.display = 'none';
        postContent.style.display = 'block';
        window.scrollTo(0, 0);
    } catch (error) {
        articleContent.innerHTML = '<h1>Error</h1><p>Failed to load article. Please check the file path.</p>';
        postsList.style.display = 'none';
        postContent.style.display = 'block';
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}