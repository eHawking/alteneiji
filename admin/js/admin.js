/**
 * Alteneiji Admin Panel - JavaScript
 */

// API Configuration
const API_BASE = '/api';
let authToken = localStorage.getItem('authToken');

// =====================
// UTILITY FUNCTIONS
// =====================

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

function showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// =====================
// AUTHENTICATION
// =====================

async function login(email, password) {
    showLoading();
    try {
        const response = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        authToken = response.data.token;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        showAdminPanel();
        loadDashboard();
        showToast('Welcome back!', 'success');
    } catch (error) {
        document.getElementById('login-error').textContent = error.message;
    } finally {
        hideLoading();
    }
}

function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    showLoginScreen();
}

function showLoginScreen() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('admin-app').classList.add('hidden');
}

function showAdminPanel() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-app').classList.remove('hidden');

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('user-name').textContent = user.firstName || user.email || 'Admin';
}

// =====================
// NAVIGATION
// =====================

function navigateTo(pageId) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        }
    });

    // Update page visibility
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`page-${pageId}`).classList.add('active');

    // Update header title
    const titles = {
        'dashboard': 'Dashboard',
        'pages': 'Pages',
        'products': 'Products',
        'services': 'Services',
        'ai-seo': 'AI SEO Generator',
        'ai-social': 'Social Media Generator',
        'ai-marketing': 'AI Marketing',
        'ai-video': 'AI Video Generator',
        'contacts': 'Contact Submissions',
        'gulfood': 'Gulfood 2026 Registrations',
        'users': 'User Management',
        'settings': 'Settings'
    };
    document.getElementById('page-title').textContent = titles[pageId] || pageId;

    // Load page data
    loadPageData(pageId);
}

async function loadPageData(pageId) {
    switch (pageId) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'contacts':
            await loadContacts();
            break;
        case 'gulfood':
            await loadGulfood();
            break;
        case 'pages':
            await loadPages();
            break;
        case 'products':
            await loadProducts();
            break;
        case 'services':
            await loadServices();
            break;
        case 'users':
            await loadUsers();
            break;
    }
}

// =====================
// DASHBOARD
// =====================

async function loadDashboard() {
    try {
        const response = await apiRequest('/admin/dashboard');
        const { stats, recent } = response.data;

        // Update stats
        document.getElementById('stat-pages').textContent = stats.pages;
        document.getElementById('stat-products').textContent = stats.products;
        document.getElementById('stat-services').textContent = stats.services;
        document.getElementById('stat-contacts').textContent = stats.newContacts;

        // Update recent contacts
        const contactsContainer = document.getElementById('recent-contacts');
        if (recent.contacts.length > 0) {
            contactsContainer.innerHTML = recent.contacts.map(c => `
                <div class="list-item">
                    <div>
                        <strong>${c.name}</strong>
                        <span class="text-muted" style="color: var(--text-muted); font-size: 12px; margin-left: 10px;">${c.subject || 'No subject'}</span>
                    </div>
                    <span class="badge badge-${c.status}">${c.status}</span>
                </div>
            `).join('');
        } else {
            contactsContainer.innerHTML = '<p class="empty-state">No recent contacts</p>';
        }

        // Update recent posts
        const postsContainer = document.getElementById('recent-posts');
        if (recent.socialPosts.length > 0) {
            postsContainer.innerHTML = recent.socialPosts.map(p => `
                <div class="list-item">
                    <div>
                        <i class="fab fa-${p.platform === 'twitter' ? 'x-twitter' : p.platform}"></i>
                        <span style="margin-left: 10px;">${p.content.substring(0, 50)}...</span>
                    </div>
                    <span class="badge badge-${p.status}">${p.status}</span>
                </div>
            `).join('');
        } else {
            postsContainer.innerHTML = '<p class="empty-state">No scheduled posts</p>';
        }
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

// =====================
// AI SEO
// =====================

async function generateSEO() {
    const content = document.getElementById('seo-content').value;
    const contentType = document.getElementById('seo-type').value;

    if (!content.trim()) {
        showToast('Please enter content to analyze', 'error');
        return;
    }

    showLoading();
    try {
        const response = await apiRequest('/ai/seo/generate', {
            method: 'POST',
            body: JSON.stringify({ content, contentType })
        });

        const data = response.data;

        // Display results
        document.getElementById('seo-meta-title').textContent = data.meta_title || '-';
        document.getElementById('seo-meta-description').textContent = data.meta_description || '-';
        document.getElementById('seo-og-title').textContent = data.og_title || '-';
        document.getElementById('seo-og-description').textContent = data.og_description || '-';

        // Keywords
        const keywordsEl = document.getElementById('seo-keywords');
        keywordsEl.innerHTML = (data.keywords || []).map(k => `<span>${k}</span>`).join('');

        // Suggestions
        const suggestionsEl = document.getElementById('seo-suggestions');
        suggestionsEl.innerHTML = (data.suggestions || []).map(s => `<li>${s}</li>`).join('');

        document.getElementById('seo-results').classList.remove('hidden');
        showToast('SEO content generated successfully!', 'success');
    } catch (error) {
        showToast(error.message || 'Failed to generate SEO', 'error');
    } finally {
        hideLoading();
    }
}

function copySEOResults() {
    const title = document.getElementById('seo-meta-title').textContent;
    const desc = document.getElementById('seo-meta-description').textContent;
    const ogTitle = document.getElementById('seo-og-title').textContent;
    const ogDesc = document.getElementById('seo-og-description').textContent;

    const text = `Meta Title: ${title}\nMeta Description: ${desc}\nOG Title: ${ogTitle}\nOG Description: ${ogDesc}`;
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
}

// =====================
// AI SOCIAL
// =====================

async function generateSocialPosts() {
    const topic = document.getElementById('social-topic').value;
    const tone = document.getElementById('social-tone').value;
    const platforms = Array.from(document.querySelectorAll('input[name="platform"]:checked'))
        .map(cb => cb.value);

    if (!topic.trim()) {
        showToast('Please enter a topic', 'error');
        return;
    }

    if (platforms.length === 0) {
        showToast('Please select at least one platform', 'error');
        return;
    }

    showLoading();
    try {
        const response = await apiRequest('/ai/social/generate', {
            method: 'POST',
            body: JSON.stringify({ topic, tone, platforms })
        });

        const posts = response.data;
        const container = document.querySelector('.social-posts-grid');

        container.innerHTML = '';

        const platformIcons = {
            instagram: 'fa-instagram',
            facebook: 'fa-facebook',
            twitter: 'fa-x-twitter',
            linkedin: 'fa-linkedin'
        };

        for (const [platform, data] of Object.entries(posts)) {
            if (data && data.content) {
                container.innerHTML += `
                    <div class="social-post-card">
                        <div class="platform-header ${platform}">
                            <i class="fab ${platformIcons[platform] || 'fa-share-alt'}"></i>
                            <span>${platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                        </div>
                        <div class="post-content">
                            <div class="post-text">${data.content}</div>
                            <div class="hashtags">
                                ${(data.hashtags || []).map(h => `<span>#${h}</span>`).join(' ')}
                            </div>
                        </div>
                        <div class="post-actions">
                            <button class="btn btn-secondary btn-sm" onclick="copyPostContent('${platform}', this)">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="savePost('${platform}', this)">
                                <i class="fas fa-save"></i> Save Draft
                            </button>
                        </div>
                    </div>
                `;
            }
        }

        // Store generated data for saving
        window.generatedPosts = posts;

        document.getElementById('social-results').classList.remove('hidden');
        showToast('Posts generated successfully!', 'success');
    } catch (error) {
        showToast(error.message || 'Failed to generate posts', 'error');
    } finally {
        hideLoading();
    }
}

function copyPostContent(platform, btn) {
    const card = btn.closest('.social-post-card');
    const text = card.querySelector('.post-text').textContent;
    const hashtags = Array.from(card.querySelectorAll('.hashtags span'))
        .map(s => s.textContent).join(' ');

    navigator.clipboard.writeText(`${text}\n\n${hashtags}`);
    showToast(`${platform} post copied!`, 'success');
}

async function savePost(platform, btn) {
    const data = window.generatedPosts[platform];
    if (!data) return;

    try {
        await apiRequest('/social/posts', {
            method: 'POST',
            body: JSON.stringify({
                platform,
                content: data.content,
                hashtags: data.hashtags || [],
                aiGenerated: true,
                aiPrompt: document.getElementById('social-topic').value
            })
        });
        showToast(`${platform} post saved as draft!`, 'success');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-check"></i> Saved';
    } catch (error) {
        showToast(error.message || 'Failed to save post', 'error');
    }
}

async function saveAllPosts() {
    if (!window.generatedPosts) return;

    showLoading();
    const topic = document.getElementById('social-topic').value;
    const platforms = Object.keys(window.generatedPosts).filter(p => window.generatedPosts[p]?.content);

    try {
        await apiRequest('/social/generate-and-create', {
            method: 'POST',
            body: JSON.stringify({
                topic,
                platforms,
                tone: document.getElementById('social-tone').value
            })
        });
        showToast('All posts saved as drafts!', 'success');
    } catch (error) {
        showToast(error.message || 'Failed to save posts', 'error');
    } finally {
        hideLoading();
    }
}

// =====================
// AI MARKETING
// =====================

async function generateMarketingCampaign() {
    const goal = document.getElementById('marketing-goal').value;
    const targetAudience = document.getElementById('marketing-audience').value;
    const budget = document.getElementById('marketing-budget').value;
    const duration = document.getElementById('marketing-duration').value;

    if (!goal.trim() || !targetAudience.trim()) {
        showToast('Please fill in campaign goal and target audience', 'error');
        return;
    }

    showLoading();
    try {
        const response = await apiRequest('/ai/marketing/campaign', {
            method: 'POST',
            body: JSON.stringify({ goal, targetAudience, budget, duration })
        });

        const campaign = response.data;

        document.getElementById('campaign-name').innerHTML = `
            <i class="fas fa-rocket"></i> ${campaign.campaign_name || 'Marketing Campaign'}
        `;

        let content = `
            <div class="campaign-section">
                <h4>📢 Tagline</h4>
                <p style="font-size: 18px; color: var(--accent-gold);">"${campaign.tagline || ''}"</p>
            </div>
            <div class="campaign-section">
                <h4>📋 Summary</h4>
                <p>${campaign.summary || ''}</p>
            </div>
        `;

        if (campaign.objectives && campaign.objectives.length > 0) {
            content += `
                <div class="campaign-section">
                    <h4>🎯 Objectives</h4>
                    <ul>${campaign.objectives.map(o => `<li>${o}</li>`).join('')}</ul>
                </div>
            `;
        }

        if (campaign.channels && campaign.channels.length > 0) {
            content += `
                <div class="campaign-section">
                    <h4>📣 Channels</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                        ${campaign.channels.map(c => `<span class="badge badge-published">${c}</span>`).join('')}
                    </div>
                </div>
            `;
        }

        if (campaign.key_messages && campaign.key_messages.length > 0) {
            content += `
                <div class="campaign-section">
                    <h4>💬 Key Messages</h4>
                    <ul>${campaign.key_messages.map(m => `<li>${m}</li>`).join('')}</ul>
                </div>
            `;
        }

        if (campaign.kpis && campaign.kpis.length > 0) {
            content += `
                <div class="campaign-section">
                    <h4>📊 KPIs</h4>
                    <ul>${campaign.kpis.map(k => `<li>${k}</li>`).join('')}</ul>
                </div>
            `;
        }

        document.getElementById('campaign-content').innerHTML = content;
        document.getElementById('marketing-results').classList.remove('hidden');

        showToast('Campaign generated successfully!', 'success');
    } catch (error) {
        showToast(error.message || 'Failed to generate campaign', 'error');
    } finally {
        hideLoading();
    }
}

// =====================
// CONTACTS & GULFOOD
// =====================

async function loadContacts() {
    try {
        const response = await apiRequest('/admin/contacts');
        const tbody = document.querySelector('#contacts-table tbody');

        tbody.innerHTML = response.data.map(c => `
            <tr>
                <td>${c.name}</td>
                <td>${c.email}</td>
                <td>${c.subject || '-'}</td>
                <td><span class="badge badge-${c.status}">${c.status}</span></td>
                <td>${formatDate(c.created_at)}</td>
                <td>
                    <button class="btn btn-ghost" onclick="viewContact('${c.uuid}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load contacts:', error);
    }
}

async function loadGulfood() {
    try {
        const response = await apiRequest('/admin/gulfood');
        const tbody = document.querySelector('#gulfood-table tbody');

        tbody.innerHTML = response.data.map(r => `
            <tr>
                <td>${r.name}</td>
                <td>${r.email}</td>
                <td>${r.company || '-'}</td>
                <td>${r.country || '-'}</td>
                <td><span class="badge badge-${r.status}">${r.status}</span></td>
                <td>
                    <button class="btn btn-ghost" onclick="viewRegistration('${r.uuid}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load gulfood registrations:', error);
    }
}

// =====================
// DATA LOADING
// =====================

async function loadPages() {
    try {
        const response = await apiRequest('/pages');
        const tbody = document.querySelector('#pages-table tbody');

        tbody.innerHTML = response.data.map(p => `
            <tr>
                <td>${p.title}</td>
                <td>/${p.slug}</td>
                <td><span class="badge badge-${p.status}">${p.status}</span></td>
                <td>${formatDate(p.updated_at)}</td>
                <td>
                    <button class="btn btn-ghost"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load pages:', error);
    }
}

async function loadProducts() {
    try {
        const response = await apiRequest('/products');
        const tbody = document.querySelector('#products-table tbody');

        tbody.innerHTML = response.data.map(p => `
            <tr>
                <td>${p.name}</td>
                <td>${p.category_name || '-'}</td>
                <td><span class="badge badge-${p.status}">${p.status}</span></td>
                <td>
                    <button class="btn btn-ghost"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load products:', error);
    }
}

async function loadServices() {
    try {
        const response = await apiRequest('/services');
        const tbody = document.querySelector('#services-table tbody');

        tbody.innerHTML = response.data.map(s => `
            <tr>
                <td>${s.name}</td>
                <td>${s.category_name || '-'}</td>
                <td><span class="badge badge-${s.status}">${s.status}</span></td>
                <td>
                    <button class="btn btn-ghost"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load services:', error);
    }
}

async function loadUsers() {
    try {
        const response = await apiRequest('/admin/users');
        const tbody = document.querySelector('#users-table tbody');

        tbody.innerHTML = response.data.map(u => `
            <tr>
                <td>${u.first_name || ''} ${u.last_name || ''}</td>
                <td>${u.email}</td>
                <td>${u.role_name || 'user'}</td>
                <td>${formatDate(u.last_login)}</td>
                <td>
                    <button class="btn btn-ghost"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

// =====================
// AI VIDEO GENERATOR
// =====================

async function generateVideo() {
    const prompt = document.getElementById('video-prompt').value;
    const platform = document.getElementById('video-platform').value;
    const style = document.getElementById('video-style').value;
    const duration = document.getElementById('video-duration').value;
    const aspect = document.getElementById('video-aspect').value;

    const options = {
        music: document.getElementById('video-music').checked,
        voiceover: document.getElementById('video-voiceover').checked,
        captions: document.getElementById('video-captions').checked,
        logo: document.getElementById('video-logo').checked
    };

    if (!prompt.trim()) {
        showToast('Please enter a video description', 'error');
        return;
    }

    const platformNames = {
        'sora': 'Sora 2 (OpenAI)',
        'veo': 'Veo 3.1 (Google)',
        'pippit': 'Pippit AI'
    };

    showLoading();
    try {
        const response = await apiRequest('/ai/video/generate', {
            method: 'POST',
            body: JSON.stringify({
                prompt,
                platform,
                style,
                duration: parseInt(duration),
                aspectRatio: aspect,
                options
            })
        });

        // Display results
        document.getElementById('video-result-platform').textContent = platformNames[platform];
        document.getElementById('video-result-status').textContent = 'Processing';
        document.getElementById('video-result-status').className = 'status-badge processing';

        const estimatedTime = duration <= 15 ? '~2 minutes' : duration <= 30 ? '~4 minutes' : '~6 minutes';
        document.getElementById('video-result-time').textContent = estimatedTime;

        document.getElementById('video-results').classList.remove('hidden');

        // Store job ID for status checking
        window.currentVideoJob = response.data?.jobId || null;

        showToast('Video generation started! This may take a few minutes.', 'success');

        // If we got a jobId, start polling for status
        if (response.data?.jobId) {
            pollVideoStatus(response.data.jobId);
        } else {
            // Demo mode - simulate completion after a delay
            simulateVideoCompletion();
        }
    } catch (error) {
        showToast(error.message || 'Failed to start video generation', 'error');
    } finally {
        hideLoading();
    }
}

async function pollVideoStatus(jobId) {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    const checkStatus = async () => {
        try {
            const response = await apiRequest(`/ai/video/status/${jobId}`);
            const status = response.data.status;

            if (status === 'completed') {
                document.getElementById('video-result-status').textContent = 'Completed';
                document.getElementById('video-result-status').className = 'status-badge completed';
                document.getElementById('video-download-btn').classList.remove('hidden');
                document.getElementById('video-download-btn').onclick = () => {
                    window.open(response.data.videoUrl, '_blank');
                };

                // Update placeholder with video
                const placeholder = document.querySelector('.video-placeholder');
                placeholder.innerHTML = `
                    <video controls style="width: 100%; border-radius: 8px;">
                        <source src="${response.data.videoUrl}" type="video/mp4">
                    </video>
                `;

                showToast('Video generated successfully!', 'success');
                loadRecentVideos();
            } else if (status === 'failed') {
                document.getElementById('video-result-status').textContent = 'Failed';
                document.getElementById('video-result-status').className = 'status-badge failed';
                showToast('Video generation failed. Please try again.', 'error');
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkStatus, 5000);
            }
        } catch (error) {
            console.error('Error checking video status:', error);
        }
    };

    setTimeout(checkStatus, 5000);
}

function simulateVideoCompletion() {
    // Demo simulation for when API is not connected
    setTimeout(() => {
        document.getElementById('video-result-status').textContent = 'Completed';
        document.getElementById('video-result-status').className = 'status-badge completed';
        document.getElementById('video-download-btn').classList.remove('hidden');

        const placeholder = document.querySelector('.video-placeholder');
        placeholder.innerHTML = `
            <i class="fas fa-check-circle" style="color: var(--accent-green);"></i>
            <p>Video generated successfully!</p>
            <p class="text-muted">Note: Actual video generation requires API keys to be configured.</p>
        `;

        showToast('Video generation simulated! Configure API keys for actual generation.', 'success');
    }, 3000);
}

function refreshVideoStatus() {
    if (window.currentVideoJob) {
        pollVideoStatus(window.currentVideoJob);
        showToast('Refreshing status...', 'info');
    } else {
        showToast('No video job in progress', 'info');
    }
}

async function loadRecentVideos() {
    try {
        const response = await apiRequest('/ai/video/recent');
        const container = document.getElementById('recent-videos');

        if (response.data && response.data.length > 0) {
            container.innerHTML = response.data.map(v => `
                <div class="video-item">
                    <div class="video-thumbnail">
                        ${v.thumbnailUrl ? `<img src="${v.thumbnailUrl}" alt="Video thumbnail">` : '<i class="fas fa-film"></i>'}
                    </div>
                    <div class="video-details">
                        <h4>${v.prompt?.substring(0, 30) || 'Marketing Video'}...</h4>
                        <p>${v.platform} • ${v.duration}s • ${formatDate(v.created_at)}</p>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to load recent videos:', error);
    }
}

// =====================
// EVENT LISTENERS
// =====================

document.addEventListener('DOMContentLoaded', () => {
    // Check if logged in
    if (authToken) {
        showAdminPanel();
        loadDashboard();
    } else {
        showLoginScreen();
    }

    // Login form
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        login(email, password);
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });

    // Mobile menu toggle
    document.querySelector('.menu-toggle').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('open');
    });

    // AI SEO Generate
    document.getElementById('generate-seo-btn').addEventListener('click', generateSEO);

    // AI Social Generate
    document.getElementById('generate-social-btn').addEventListener('click', generateSocialPosts);

    // AI Marketing Generate
    document.getElementById('generate-marketing-btn').addEventListener('click', generateMarketingCampaign);

    // AI Video Generate
    document.getElementById('generate-video-btn').addEventListener('click', generateVideo);
    document.getElementById('video-refresh-btn').addEventListener('click', refreshVideoStatus);

    // Save all social posts
    document.getElementById('save-all-posts').addEventListener('click', saveAllPosts);

    // Settings form
    document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();
        try {
            await apiRequest('/admin/settings', {
                method: 'PUT',
                body: JSON.stringify({
                    settings: {
                        site_name: document.getElementById('setting-site-name').value,
                        site_tagline: document.getElementById('setting-tagline').value,
                        contact_email: document.getElementById('setting-email').value,
                        contact_phone: document.getElementById('setting-phone').value.split(',').map(p => p.trim()),
                        contact_address: document.getElementById('setting-address').value
                    }
                })
            });
            showToast('Settings saved successfully!', 'success');
        } catch (error) {
            showToast(error.message || 'Failed to save settings', 'error');
        } finally {
            hideLoading();
        }
    });
});

// Make functions globally available
window.copySEOResults = copySEOResults;
window.copyPostContent = copyPostContent;
window.savePost = savePost;
window.generateVideo = generateVideo;
window.refreshVideoStatus = refreshVideoStatus;

