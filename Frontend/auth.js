const AUTH_API_URL = 'https://localhost:7150/api/auth';
const CONTACT_API_URL = 'https://localhost:7150/api/contact';

const authSection = document.getElementById('auth-section');
const contactsSection = document.getElementById('contacts-section');
const signupForm = document.getElementById('signup-form');
const signinForm = document.getElementById('signin-form');
const contactForm = document.getElementById('contact-form');
const contactModal = document.getElementById('contact-modal');
const contactSubmit = document.getElementById('contact-submit');
const contactCancel = document.getElementById('contact-cancel');
const modalTitle = document.getElementById('modal-title');
const contactsList = document.getElementById('contacts-list');
const searchContacts = document.getElementById('search-contacts');
const emptyState = document.getElementById('empty-state');
const settingsBtn = document.getElementById('settings-btn');
const settingsDiv = document.getElementById('settings-div');
const profileBtn = document.getElementById('profile-btn');
const themeToggle = document.getElementById('theme-toggle');
const addContactBtn = document.getElementById('add-contact');
const logoutBtn = document.getElementById('logout');
const exportBtn = document.getElementById('export-btn');
const spinner = document.getElementById('spinner');
const toastContainer = document.getElementById('toast-container');

let contacts = [];
let deletedContact = null;
let favorites = new Set();

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggle.innerHTML = `Toggle Theme <i class="fas ${savedTheme === 'light' ? 'fa-moon' : 'fa-sun'} ml-2"></i>`;
  if (await isAuthenticated()) {
    showContacts();
    fetchContacts();
  }
});

// Toggle settings div
settingsBtn.onclick = () => {
  settingsDiv.classList.toggle('hidden');
};

// Close settings
document.addEventListener('click', (e) => {
  if (!settingsBtn.contains(e.target) && !settingsDiv.contains(e.target)) {
    settingsDiv.classList.add('hidden');
  }
});

// Theme toggle
themeToggle.onclick = () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  themeToggle.innerHTML = `Toggle Theme <i class="fas ${newTheme === 'light' ? 'fa-moon' : 'fa-sun'} ml-2"></i>`;
};

// Profile view
profileBtn.onclick = async () => {
  settingsDiv.classList.add('hidden');
  showSpinner();
  try {
    const res = await makeAuthenticatedRequest(`${AUTH_API_URL}/getUser`);
    if (!res) return;
    if (res.ok) {
      const user = await res.json();
      contactModal.classList.remove('hidden');
      modalTitle.textContent = 'Your Profile';
      contactForm.innerHTML = `
        <table class="w-full">
          <tr><th class="text-left text-textSecondary w-1/3">First Name</th><td>${user.firstName}</td></tr>
          <tr><th class="text-left text-textSecondary">Last Name</th><td>${user.lastName || ''}</td></tr>
          <tr><th class="text-left text-textSecondary">Username</th><td>${user.userName}</td></tr>
          <tr><th class="text-left text-textSecondary">Email</th><td>${user.email || ''}</td></tr>
          <tr><th class="text-left text-textSecondary">Phone</th><td>${user.phoneNumber || ''}</td></tr>
          <tr><th class="text-left text-textSecondary">Role</th><td>${user.role || ''}</td></tr>
        </table>
        <button type="button" id="contact-cancel" class="btn btn-secondary w-full mt-4">Close</button>
      `;
      document.getElementById('contact-cancel').onclick = () => {
        contactModal.classList.add('hidden');
        contactForm.reset();
        contactForm.innerHTML = originalContactForm;
      };
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || 'Failed to load profile.', 'error');
    }
  } catch (err) {
    showToast('Cannot connect to server.', 'error');
  } finally {
    hideSpinner();
  }
};

// Add contact
addContactBtn.onclick = () => {
  contactForm.reset();
  document.getElementById('contactId').value = '0';
  contactSubmit.textContent = 'Add Contact';
  modalTitle.textContent = 'Add Contact';
  contactModal.classList.remove('hidden');
  settingsDiv.classList.add('hidden');
};

// Export contacts
exportBtn.onclick = () => {
  const csv = [
    ['First Name', 'Last Name', 'Full Name', 'Email', 'Phone Number', 'Address'],
    ...contacts.map(c => [
      `"${c.firstName}"`,
      `"${c.lastName || ''}"`,
      `"${c.fullName}"`,
      `"${c.email || ''}"`,
      `"${c.phoneNumber || ''}"`,
      `"${c.address || ''}"`
    ])
  ].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'contacts.csv';
  a.click();
  URL.revokeObjectURL(url);
};

// Toggle auth forms
document.getElementById('show-signup').onclick = () => {
  signupForm.classList.remove('hidden');
  signinForm.classList.add('hidden');
};

document.getElementById('show-signin').onclick = () => {
  signupForm.classList.add('hidden');
  signinForm.classList.remove('hidden');
};

// Modal controls
contactCancel.onclick = () => {
  contactModal.classList.add('hidden');
};

contactModal.onclick = (e) => {
  if (e.target === contactModal) contactModal.classList.add('hidden');
};

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (contactModal.classList.contains('hidden') && settingsDiv.classList.contains('hidden')) {
    const cards = Array.from(document.querySelectorAll('.contact-card'));
    const focused = document.activeElement.closest('.contact-card');
    const index = focused ? cards.indexOf(focused) : -1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = index + 1 < cards.length ? cards[index + 1] : cards[0];
      next.querySelector('.contact-header').focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = index - 1 >= 0 ? cards[index - 1] : cards[cards.length - 1];
      prev.querySelector('.contact-header').focus();
    } else if (e.key === 'Enter' && focused) {
      e.preventDefault();
      focused.querySelector('.contact-header').click();
    }
  }
  if (e.key === 'Escape') {
    contactModal.classList.add('hidden');
    settingsDiv.classList.add('hidden');
  }
});

// Search contacts
searchContacts.oninput = debounce(() => {
  const query = searchContacts.value.toLowerCase();
  renderContacts(contacts.filter(c => 
    c.fullName.toLowerCase().includes(query) || 
    (c.phoneNumber && c.phoneNumber.toLowerCase().includes(query))
  ));
}, 300);

// Sign-up
signupForm.onsubmit = async (e) => {
  e.preventDefault();
  const payload = {
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    userName: document.getElementById('userName').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
    phoneNumber: document.getElementById('phoneNumber').value,
  };

  showSpinner();
  try {
    const res = await fetch(`${AUTH_API_URL}/sighUp`, {
      method: 'POST',
      headers: { 'Accept': '*/*', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      showToast('Sign-up successful! Please sign in.', 'success');
      signupForm.classList.add('hidden');
      signinForm.classList.remove('hidden');
      signupForm.reset();
    } else {
      const data = await res.json().catch(() => ({}));
      console.error('Sign-up error:', res.status, data.error);
      showToast(data.error || `Sign-up failed (Status: ${res.status})`, 'error');
    }
  } catch (err) {
    console.error('Sign-up failed:', err.message);
    showToast('Cannot connect to server.', 'error');
  } finally {
    hideSpinner();
  }
};

// Sign-in
signinForm.onsubmit = async (e) => {
  e.preventDefault();
  const payload = {
    userName: document.getElementById('signin-userName').value,
    password: document.getElementById('signin-password').value,
  };

  showSpinner();
  try {
    const res = await fetch(`${AUTH_API_URL}/signIn`, {
      method: 'POST',
      headers: { 'Accept': '*/*', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('tokenType', data.tokenType);
      localStorage.setItem('expires', Date.now() + data.expires * 1000);
      showToast('Sign-in successful!', 'success');
      contacts = []; // Clear previous contacts
      showContacts();
      await fetchContacts();
    } else {
      const data = await res.json().catch(() => ({}));
      console.error('Sign-in error:', res.status, data.error);
      showToast(data.error || `Sign-in failed (Status: ${res.status})`, 'error');
    }
  } catch (err) {
    console.error('Sign-in failed:', err.message);
    showToast('Cannot connect to server.', 'error');
  } finally {
    hideSpinner();
  }
};

// Create/Update contact
contactForm.onsubmit = async (e) => {
  e.preventDefault();
  const contactId = parseInt(document.getElementById('contactId').value);
  const payload = {
    contactId,
    firstName: document.getElementById('contact-firstName').value,
    lastName: document.getElementById('contact-lastName').value,
    email: document.getElementById('contact-email').value,
    phoneNumber: document.getElementById('contact-phoneNumber').value,
    address: document.getElementById('contact-address').value,
  };

  const isUpdate = contactId > 0;
  showSpinner();
  try {
    const res = await makeAuthenticatedRequest(
      `${CONTACT_API_URL}/${isUpdate ? 'update' : 'post'}`,
      isUpdate ? 'PUT' : 'POST',
      payload
    );
    if (!res) return;
    if (res.ok) {
      showToast(`Contact ${isUpdate ? 'updated' : 'added'}!`, 'success');
      contactForm.reset();
      document.getElementById('contactId').value = '0';
      contactSubmit.textContent = 'Add Contact';
      modalTitle.textContent = 'Add Contact';
      contactModal.classList.add('hidden');
      fetchContacts();
    } else {
      const data = await res.json().catch(() => ({}));
      console.error('Contact error:', res.status, data.error);
      showToast(data.error || `Failed to ${isUpdate ? 'update' : 'add'} contact`, 'error');
    }
  } catch (err) {
    console.error('Contact failed:', err.message);
    showToast('Cannot connect to server.', 'error');
  } finally {
    hideSpinner();
  }
};

// Fetch contacts
async function fetchContacts() {
  showSpinner();
  contactsList.innerHTML = Array(3).fill().map(() => document.querySelector('.skeleton').innerHTML).join('');
  try {
    const res = await makeAuthenticatedRequest(`${CONTACT_API_URL}/getAll`);
    if (!res) return;
    if (res.ok) {
      contacts = await res.json();
      renderContacts(contacts);
    } else {
      const data = await res.json().catch(() => ({}));
      console.error('Fetch error:', res.status, data.error);
      showToast(data.error || `Failed to fetch contacts`, 'error');
    }
  } catch (err) {
    console.error('Fetch failed:', err.message);
    showToast('Cannot connect to server.', 'error');
  } finally {
    hideSpinner();
  }
}

// Render contacts
function renderContacts(contactList) {
  contactsList.innerHTML = '';
  if (contactList.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  const sortedContacts = [...contactList].sort((a, b) => {
    const aFav = favorites.has(a.contactId);
    const bFav = favorites.has(b.contactId);
    return aFav === bFav ? a.fullName.localeCompare(b.fullName) : bFav - aFav;
  });
  sortedContacts.forEach(c => {
    const card = document.createElement('div');
    card.className = 'contact-card';
    card.tabIndex = 0;
    const initials = c.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    card.innerHTML = `
      <div class="contact-header" data-id="${c.contactId}">
        <div class="avatar">${initials}</div>
        <div class="flex-1">
          <div class="font-medium text-textPrimary">${c.fullName}</div>
          <div class="text-sm text-textSecondary">${c.phoneNumber || ''}</div>
        </div>
        <button class="favorite-btn" data-id="${c.contactId}">
          <i class="fas fa-star ${favorites.has(c.contactId) ? 'text-yellow-400' : 'text-gray-400'}"></i>
        </button>
        <svg class="w-5 h-5 text-textSecondary transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>
      <div class="contact-details hidden">
        <table class="w-full">
          <tr><th class="text-left text-textSecondary w-1/3">First Name</th><td>${c.firstName}</td></tr>
          <tr><th class="text-left text-textSecondary">Last Name</th><td>${c.lastName || ''}</td></tr>
          <tr><th class="text-left text-textSecondary">Full Name</th><td>${c.fullName}</td></tr>
          <tr><th class="text-left text-textSecondary">Email</th><td>${c.email || ''}</td></tr>
          <tr><th class="text-left text-textSecondary">Phone</th><td>${c.phoneNumber || ''}</td></tr>
          <tr><th class="text-left text-textSecondary">Address</th><td>${c.address || ''}</td></tr>
        </table>
        <div class="mt-4 flex space-x-2 justify-end">
          <button class="edit-btn btn btn-edit" data-id="${c.contactId}"><i class="fas fa-edit"></i></button>
          <button class="delete-btn btn btn-delete" data-id="${c.contactId}"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
    contactsList.appendChild(card);

    card.querySelector('.contact-header').onclick = () => {
      document.querySelectorAll('.contact-details').forEach(d => {
        if (d !== card.querySelector('.contact-details')) d.classList.add('hidden');
      });
      document.querySelectorAll('.contact-header svg').forEach(s => {
        if (s !== card.querySelector('svg')) s.classList.remove('rotate-180');
      });
      const details = card.querySelector('.contact-details');
      const arrow = card.querySelector('svg');
      details.classList.toggle('hidden');
      arrow.classList.toggle('rotate-180');
    };

    card.querySelector('.favorite-btn').onclick = (e) => {
      e.stopPropagation();
      const id = parseInt(c.contactId);
      if (favorites.has(id)) {
        favorites.delete(id);
      } else {
        favorites.add(id);
      }
      renderContacts(contacts);
    };

    card.querySelector('.edit-btn').onclick = (e) => {
      e.stopPropagation();
      editContact(c.contactId, c);
    };
    card.querySelector('.delete-btn').onclick = (e) => {
      e.stopPropagation();
      deleteContact(c.contactId, c);
    };
  });
}

// Edit contact
function editContact(id, contact) {
  document.getElementById('contactId').value = contact.contactId;
  document.getElementById('contact-firstName').value = contact.firstName;
  document.getElementById('contact-lastName').value = contact.lastName || '';
  document.getElementById('contact-email').value = contact.email || '';
  document.getElementById('contact-phoneNumber').value = contact.phoneNumber || '';
  document.getElementById('contact-address').value = contact.address || '';
  contactSubmit.textContent = 'Update Contact';
  modalTitle.textContent = 'Edit Contact';
  contactModal.classList.remove('hidden');
}

// Delete contact
async function deleteContact(id, contact) {
  if (!confirm('Are you sure you want to delete this contact?')) return;
  showSpinner();
  deletedContact = { id, contact };
  try {
    const res = await makeAuthenticatedRequest(`${CONTACT_API_URL}/delete?contactId=${id}`, 'DELETE');
    if (!res) return;
    if (res.ok) {
      showToast(`Contact deleted. <button onclick="undoDelete()">Undo</button>`, 'success', false);
      fetchContacts();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || 'Failed to delete contact', 'error');
    }
  } catch (err) {
    console.error('Delete failed:', err.message);
    showToast('Cannot connect to server.', 'error');
  } finally {
    hideSpinner();
  }
}

// Undo delete
async function undoDelete() {
  if (!deletedContact) return;
  showSpinner();
  try {
    const { contact } = deletedContact;
    const res = await makeAuthenticatedRequest(`${CONTACT_API_URL}/post`, 'POST', contact);
    if (!res) return;
    if (res.ok) {
      showToast('Contact restored!', 'success');
      fetchContacts();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || 'Failed to restore contact', 'error');
    }
  } catch (err) {
    showToast('Cannot connect to server.', 'error');
  } finally {
    deletedContact = null;
    hideSpinner();
  }
}

// Logout
logoutBtn.onclick = async () => {
  showSpinner();
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    const res = await makeAuthenticatedRequest(`${AUTH_API_URL}/LogOut?token=${encodeURIComponent(refreshToken)}`, 'DELETE');
    if (!res) return;
    if (res.ok) {
      showToast('Logged out successfully!', 'success');
    } else {
      const data = await res.json().catch(() => ({}));
      console.error('Logout error:', res.status, data.error);
      showToast(data.error || 'Logout failed.', 'error');
    }
  } catch (err) {
    console.error('Logout failed:', err.message);
    showToast('Cannot connect to server.', 'error');
  } finally {
    localStorage.clear();
    contacts = []; // Clear contacts on logout
    showAuth();
    hideSpinner();
    settingsDiv.classList.add('hidden');
  }
};

// Authenticated request
async function makeAuthenticatedRequest(url, method = 'GET', body = null) {
  const accessToken = localStorage.getItem('accessToken');
  const expires = parseInt(localStorage.getItem('expires'));
  const refreshToken = localStorage.getItem('refreshToken');

  if (!accessToken || !refreshToken) {
    showToast('Please sign in again.', 'error');
    showAuth();
    return null;
  }

  if (Date.now() > expires) {
    if (!await refreshAccessToken()) {
      showToast('Session expired. Please sign in again.', 'error');
      showAuth();
      return null;
    }
  }

  const headers = {
    'Accept': '*/*',
    'Content-Type': 'application/json',
    'Authorization': `${localStorage.getItem('tokenType')} ${localStorage.getItem('accessToken')}`,
  };

  try {
    let res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
    if (res.status === 401) {
      if (await refreshAccessToken()) {
        headers.Authorization = `${localStorage.getItem('tokenType')} ${localStorage.getItem('accessToken')}`;
        res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
      } else {
        showToast('Session expired. Please sign in again.', 'error');
        showAuth();
        return null;
      }
    }
    return res;
  } catch (err) {
    console.error('Error:', err.message);
    showToast('Cannot connect to server.', 'error');
    return null;
  }
}

// Refresh token
async function refreshAccessToken() {
  const payload = {
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
  };

  try {
    const res = await fetch(`${AUTH_API_URL}/refreshToken`, {
      method: 'POST',
      headers: { 'Accept': '*/*', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('tokenType', data.tokenType);
      localStorage.setItem('expires', Date.now() + data.expires * 1000);
      return true;
    } else {
      const data = await res.json().catch(() => ({}));
      console.error('Refresh error:', res.status, data.error);
      showToast(data.error || 'Token refresh failed.', 'error');
      localStorage.clear();
      return false;
    }
  } catch (err) {
    console.error('Refresh failed:', err.message);
    showToast('Cannot connect to server.', 'error');
    localStorage.clear();
    return false;
  }
}

// Check if authenticated
async function isAuthenticated() {
  const accessToken = localStorage.getItem('accessToken');
  const expires = parseInt(localStorage.getItem('expires'));
  const refreshToken = localStorage.getItem('refreshToken');

  if (!accessToken || !refreshToken) return false;
  if (Date.now() > expires) {
    return await refreshAccessToken();
  }
  return true;
}

// Show auth section
function showAuth() {
  contactsSection.classList.add('hidden');
  authSection.classList.remove('hidden');
  signupForm.classList.add('hidden');
  signinForm.classList.remove('hidden');
}

// Show contacts section
function showContacts() {
  authSection.classList.add('hidden');
  contactsSection.classList.remove('hidden');
}

// Show/hide spinner
function showSpinner() {
  spinner.classList.remove('hidden');
}

function hideSpinner() {
  spinner.classList.add('hidden');
}

// Show toast
function showToast(message, type = 'error', autoClose = true) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = message;
  toastContainer.appendChild(toast);
  if (autoClose) setTimeout(() => toast.remove(), 5000);
}

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Store original contact form
const originalContactForm = contactForm.innerHTML;