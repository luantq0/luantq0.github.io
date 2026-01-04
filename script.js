// List of posts - Add your markdown files here
const posts = [
    // Research posts
    { 
        title: 'No data',
        category: 'research',
        file: 'posts/research/no_data.md',
        date: '2025-01-01',
        description: 'No data.'
    },

    
    // Blog posts
    
    // CTF posts
];

let currentCategory = 'all';
let currentPosts = posts;

// DOM Elements
const postsList = document.getElementById('postsList');
const postContent = document.getElementById('postContent');
const articleContent = document.getElementById('articleContent');
const backBtn = document.getElementById('backBtn');
const searchInput = document.getElementById('searchInput');
const navLinks = document.querySelectorAll('.nav-links a');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    displayPosts(posts);
    setupEventListeners();
    setupHeaderScroll();
    setupThemeToggle();
    
    // Home link functionality
    document.getElementById('homeLink').addEventListener('click', (e) => {
        e.preventDefault();
        postContent.style.display = 'none';
        postsList.style.display = 'flex';
        
        // Reset category filter
        navLinks.forEach(l => l.classList.remove('active'));
        currentCategory = 'all';
        searchInput.value = '';
        displayPosts(posts);
        
        // Scroll to top
        window.scrollTo(0, 0);
    });
});

// Theme toggle functionality
function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
    }
    
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        
        // Save preference
        const theme = body.classList.contains('dark-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
    });
}

// Header hide/show on scroll
function setupHeaderScroll() {
    let lastScroll = 0;
    const header = document.querySelector('header');
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll <= 0) {
            header.classList.remove('hidden');
            return;
        }
        
        if (currentScroll > lastScroll && currentScroll > 100) {
            // Scrolling down
            header.classList.add('hidden');
        } else {
            // Scrolling up
            header.classList.remove('hidden');
        }
        
        lastScroll = currentScroll;
    });
}

// Setup event listeners
function setupEventListeners() {
    // Category navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = e.target.dataset.category;
            
            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
            
            // Filter and display posts
            currentCategory = category;
            filterPosts();
        });
    });
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        filterPosts();
    });
    
    // Back button
    backBtn.addEventListener('click', () => {
        postContent.style.display = 'none';
        postsList.style.display = 'flex';
    });
}

// Filter posts based on category and search
function filterPosts() {
    const searchTerm = searchInput.value.toLowerCase();
    
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
    
    currentPosts = filtered;
    displayPosts(filtered);
}

// Display posts as list
function displayPosts(postsToDisplay) {
    if (postsToDisplay.length === 0) {
        postsList.innerHTML = '<div class="no-posts">No articles found</div>';
        return;
    }
    
    postsList.innerHTML = postsToDisplay.map(post => `
        <div class="post-card" onclick="loadPost('${post.file}')">
            <div class="post-info">
                <div class="post-header">
                    <span class="category-badge ${post.category}">${getCategoryName(post.category)}</span>
                    <span class="post-date">${formatDate(post.date)}</span>
                </div>
                <h3>${post.title}</h3>
                <p class="post-description">${post.description}</p>
            </div>
        </div>
    `).join('');
}

// Load and display a single post
async function loadPost(filePath) {
    try {
        const response = await fetch(filePath);
        
        if (!response.ok) {
            throw new Error('Failed to load article');
        }
        
        const markdown = await response.text();
        const html = marked.parse(markdown);
        
        articleContent.innerHTML = html;
        postsList.style.display = 'none';
        postContent.style.display = 'block';
        
        // Scroll to top
        window.scrollTo(0, 0);
    } catch (error) {
        articleContent.innerHTML = `
            <h1>Error</h1>
            <p>Failed to load article. Please check the file path.</p>
        `;
        postsList.style.display = 'none';
        postContent.style.display = 'block';
    }
}

// Helper functions
function getCategoryName(category) {
    const names = {
        'research': 'RESEARCH',
        'blogs': 'BLOGS',
        'ctf': 'CTF'
    };
    return names[category] || category.toUpperCase();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}