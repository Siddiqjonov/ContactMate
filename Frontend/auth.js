const AUTH_API_URL = 'https://localhost:7150/api/auth';
const CONTACT_API_URL = 'https://localhost:7150/api/contact';
const ADMIN_API_URL = 'https://localhost:7150/api/admin';
const ROLE_API_URL = 'https://localhost:7150/api/role';

const authSection = document.getElementById('auth-section');
const contactsSection = document.getElementById('contacts-section');
const adminSection = document.getElementById('admin-section');
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
const adminPanelBtn = document.getElementById('admin-panel-btn');
const logoutBtn = document.getElementById('logout');
const exportBtn = document.getElementById('export-btn');
const spinner = document.getElementById('spinner');
const toastContainer = document.getElementById('toast-container');
const backToContacts = document.getElementById('back-to-contacts');
const searchUsers = document.getElementById('search-users');
const searchUsersBtn = document.getElementById('search-users-btn');
const usersList = document.getElementById('users-list');
const usersEmptyState = document.getElementById('users-empty-state');
const addRoleBtn = document.getElementById('add-role-btn');
const addRoleContainer = document.getElementById('add-role-container');
const rolesList = document.getElementById('roles-list');
const rolesEmptyState = document.getElementById('roles-empty-state');
const roleModal = document.getElementById('role-modal');
const roleForm = document.getElementById('role-form');
const roleSubmit = document.getElementById('role-submit');
const roleCancel = document.getElementById('role-cancel');
const roleModalTitle = document.getElementById('role-modal-title');
const manageUsersSection = document.getElementById('manage-users-section');
const manageRolesSection = document.getElementById('manage-roles-section');
const manageUsersBtn = document.getElementById('manage-users-btn');
const manageRolesBtn = document.getElementById('manage-roles-btn');

let contacts = [];
let users = [];
let roles = [];
let deletedContact = null;
let deletedUser = null;
let deletedRole = null;
let favorites = new Set();
let currentUser = null;

// Valid roles for validation
const VALID_ROLES = ['User', 'Admin', 'SuperAdmin'];

// Input sanitization function
function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggle.innerHTML = `Toggle Theme <i class="fas ${savedTheme === 'light' ? 'fa-moon' : 'fa-sun'} ml-2"></i>`;
  if (await isAuthenticated()) {
    await fetchCurrentUser();
    showContacts();
    fetchContacts();
    if (currentUser && (currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin')) {
      adminPanelBtn.classList.remove('hidden');
    }
  }
});

// Fetch current user
async function fetchCurrentUser() {
  try {
    const res = await makeAuthenticatedRequest(`${AUTH_API_URL}/getUser`);
    if (res && res.ok) {
      currentUser = await res.json();
      if (currentUser && currentUser.role) {
        currentUser.role = currentUser.role; // Keep exact casing
      }
    } else {
      showToast('Failed to fetch user data.', 'error');
    }
  } catch (err) {
    showToast('Cannot connect to server.', 'error');
  }
}

// Toggle settings div
settingsBtn.onclick = () => {
  settingsDiv.classList.toggle('hidden');
};

// Close settings on click outside
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
          <tr><th class="text-left text-textSecondary w-1/3">First Name</th><td>${sanitizeInput(user.firstName)}</td></tr>
          <tr><th class="text-left text-textSecondary">Last Name</th><td>${sanitizeInput(user.lastName || '')}</td></tr>
          <tr><th class="text-left text-textSecondary">Username</th><td>${sanitizeInput(user.userName)}</td></tr>
          <tr><th class="text-left text-textSecondary">Email</th><td>${sanitizeInput(user.email || '')}</td></tr>
          <tr><th class="text-left text-textSecondary">Phone</th><td>${sanitizeInput(user.phoneNumber || '')}</td></tr>
          <tr><th class="text-left text-textSecondary">Role</th><td>${sanitizeInput(user.role || '')}</td></tr>
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

// Admin panel
adminPanelBtn.onclick = async () => {
  settingsDiv.classList.add('hidden');
  showAdminPanel('users');
  await fetchUsersByRole('User');
  await fetchRoles();
  if (currentUser && currentUser.role === 'SuperAdmin') {
    addRoleContainer.classList.remove('hidden');
  }
};

// Back to contacts
backToContacts.onclick = () => {
  adminSection.classList.add('hidden');
  addRoleContainer.classList.add('hidden');
  showContacts();
};

// Export contacts
exportBtn.onclick = () => {
  const csv = [
    ['First Name', 'Last Name', 'Full Name', 'Email', 'Phone Number', 'Address'],
    ...contacts.map(c => [
      `"${sanitizeInput(c.firstName)}"`,
      `"${sanitizeInput(c.lastName || '')}"`,
      `"${sanitizeInput(c.fullName)}"`,
      `"${sanitizeInput(c.email || '')}"`,
      `"${sanitizeInput(c.phoneNumber || '')}"`,
      `"${sanitizeInput(c.address || '')}"`
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

roleCancel.onclick = () => {
  roleModal.classList.add('hidden');
};

roleModal.onclick = (e) => {
  if (e.target === roleModal) roleModal.classList.add('hidden');
};

// Section switching
manageUsersBtn.onclick = () => showAdminPanel('users');
manageRolesBtn.onclick = () => showAdminPanel('roles');

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (contactModal.classList.contains('hidden') && roleModal.classList.contains('hidden') && settingsDiv.classList.contains('hidden')) {
    const cards = Array.from(document.querySelectorAll('.contact-card, .user-card, .role-card'));
    const focused = document.activeElement.closest('.contact-card, .user-card, .role-card');
    const index = focused ? cards.indexOf(focused) : -1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = index + 1 < cards.length ? cards[index + 1] : cards[0];
      next.querySelector('.contact-header, .user-header, .role-header').focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = index - 1 >= 0 ? cards[index - 1] : cards[cards.length - 1];
      prev.querySelector('.contact-header, .user-header, .role-header').focus();
    } else if (e.key === 'Enter' && focused) {
      e.preventDefault();
      focused.querySelector('.contact-header, .user-header, .role-header').click();
    }
  }
  if (e.key === 'Escape') {
    contactModal.classList.add('hidden');
    roleModal.classList.add('hidden');
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

// Search users by role
searchUsersBtn.onclick = async () => {
  const query = sanitizeInput(searchUsers.value.trim());
  if (!query) {
    showToast('Please enter a role to search.', 'error');
    searchUsers.classList.add('input-error');
    return;
  }
  if (!VALID_ROLES.includes(query)) {
    showToast(`Invalid role. Valid roles are: ${VALID_ROLES.join(', ')}`, 'error');
    searchUsers.classList.add('input-error');
    return;
  }
  searchUsers.classList.remove('input-error');
  await fetchUsersByRole(query);
};

// Add role
addRoleBtn.onclick = () => {
  if (currentUser && currentUser.role !== 'SuperAdmin') return;
  roleForm.reset();
  document.getElementById('role-id').value = '0';
  roleSubmit.textContent = 'Add Role';
  roleModalTitle.textContent = 'Add Role';
  roleModal.classList.remove('hidden');
};

// Sign-up
signupForm.onsubmit = async (e) => {
  e.preventDefault();
  const payload = {
    firstName: sanitizeInput(document.getElementById('firstName').value),
    lastName: sanitizeInput(document.getElementById('lastName').value),
    userName: sanitizeInput(document.getElementById('userName').value),
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
    phoneNumber: document.getElementById('phoneNumber').value,
  };

  showSpinner();
  try {
    const res = await fetch(`${AUTH_API_URL}/signUp`, {
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
      showToast(data.error || `Sign-up failed (Status: ${res.status})`, 'error');
    }
  } catch (err) {
    showToast('Cannot connect to server.', 'error');
  } finally {
    hideSpinner();
  }
};

// Sign-in
signinForm.onsubmit = async (e) => {
  e.preventDefault();
  const payload = {
    userName: sanitizeInput(document.getElementById('signin-userName').value),
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
      await fetchCurrentUser();
      showToast('Sign-in successful!', 'success');
      contacts = [];
      showContacts();
      await fetchContacts();
      if (currentUser && (currentUser.role === 'Admin' || currentUser.role === 'SuperAdmin')) {
        adminPanelBtn.classList.remove('hidden');
      }
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || `Sign-in failed (Status: ${res.status})`, 'error');
    }
  } catch (err) {
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
    firstName: sanitizeInput(document.getElementById('contact-firstName').value),
    lastName: sanitizeInput(document.getElementById('contact-lastName').value),
    email: document.getElementById('contact-email').value,
    phoneNumber: document.getElementById('contact-phoneNumber').value,
    address: sanitizeInput(document.getElementById('contact-address').value),
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
      showToast(data.error || `Failed to ${isUpdate ? 'update' : 'add'} contact`, 'error');
    }
  } catch (err) {
    showToast('Cannot connect to server.', 'error');
  } finally {
    hideSpinner();
  }
};

// Create/Update role
roleForm.onsubmit = async (e) => {
  e.preventDefault();
  if (currentUser && currentUser.role !== 'SuperAdmin') {
    showToast('Only SuperAdmins can create or edit roles.', 'error');
    return;
  }
  const roleId = parseInt(document.getElementById('role-id').value);
  const payload = {
    userRoleId: roleId,
    userRoleName: sanitizeInput(document.getElementById('role-name').value),
    description: sanitizeInput(document.getElementById('role-description').value),
  };

  const isUpdate = roleId > 0;
  showSpinner();
  try {
    const res = await makeAuthenticatedRequest(
      `${ROLE_API_URL}/${isUpdate ? 'update' : 'post'}`,
      isUpdate ? 'PUT' : 'POST',
      payload
    );
    if (!res) return;
    if (res.ok) {
      showToast(`Role ${isUpdate ? 'updated' : 'added'}!`, 'success');
      roleForm.reset();
      document.getElementById('role-id').value = '0';
      roleSubmit.textContent = 'Add Role';
      roleModalTitle.textContent = 'Add Role';
      roleModal.classList.add('hidden');
      fetchRoles();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || `Failed to ${isUpdate ? 'update' : 'add'} role`, 'error');
    }
  } catch (err) {
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
      showToast(data.error || 'Failed to fetch contacts', 'error');
    }
  } catch (err) {
    showToast('Cannot connect to server.', 'error');
  } finally {
    hideSpinner();
  }
}

// Fetch users by role
async function fetchUsersByRole(role) {
  showSpinner();
  usersList.innerHTML = Array(3).fill().map(() => document.querySelector('#manage-users-section .skeleton').innerHTML).join('');
  try {
    const url = `${ADMIN_API_URL}/getUsersByRole?role=${encodeURIComponent(role)}`;
    const res = await makeAuthenticatedRequest(url);
    if (!res) return;
    if (res.ok) {
      users = await res.json();
      renderUsers(users);
      usersEmptyState.classList.toggle('hidden', users.length > 0);
    } else {
      const data = await res.json().catch(() => ({}));
      let errorMsg = data.error || `Failed to fetch users for role "${role}"`;
      if (res.status === 400 || res.status === 404) {
        errorMsg = `Invalid role "${role}". Valid roles are: ${VALID_ROLES.join(', ')}`;
      }
      showToast(errorMsg, 'error');
      usersList.innerHTML = '';
      usersEmptyState.classList.remove('hidden');
    }
  } catch (err) {
    showToast('Cannot connect to server.', 'error');
    usersList.innerHTML = '';
    usersEmptyState.classList.remove('hidden');
  } finally {
    hideSpinner();
  }
}

// Fetch roles
async function fetchRoles() {
  showSpinner();
  rolesList.innerHTML = Array(3).fill().map(() => document.querySelector('#manage-roles-section .skeleton').innerHTML).join('');
  try {
    const res = await makeAuthenticatedRequest(`${ROLE_API_URL}/getAll`);
    if (!res) return;
    if (res.ok) {
      roles = await res.json();
      renderRoles(roles);
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || `Failed to fetch roles (Status: ${res.status})`, 'error');
    }
  } catch (err) {
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
          <div class="font-medium text-textPrimary">${sanitizeInput(c.fullName)}</div>
          <div class="text-sm text-textSecondary">${sanitizeInput(c.phoneNumber || '')}</div>
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
          <tr><th class="text-left text-textSecondary w-1/3">First Name</th><td>${sanitizeInput(c.firstName)}</td></tr>
          <tr><th class="text-left text-textSecondary">Last Name</th><td>${sanitizeInput(c.lastName || '')}</td></tr>
          <tr><th class="text-left text-textSecondary">Full Name</th><td>${sanitizeInput(c.fullName)}</td></tr>
          <tr><th class="text-left text-textSecondary">Email</th><td>${sanitizeInput(c.email || '')}</td></tr>
          <tr><th class="text-left text-textSecondary">Phone</th><td>${sanitizeInput(c.phoneNumber || '')}</td></tr>
          <tr><th class="text-left text-textSecondary">Address</th><td>${sanitizeInput(c.address || '')}</td></tr>
        </table>
        <div class="mt-4 flex space-x-2 justify-end">
          <button class="edit-btn btn btn-edit" data-id="${c.contactId}"><i class="fas fa-edit"></i></button>
          <button class="delete-btn btn btn-delete" data-id="${c.contactId}"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
    contactsList.appendChild(card);

    card.querySelector('.contact-header').onclick = () => {
      document.querySelectorAll('.contact-details, .user-details, .role-details').forEach(d => {
        if (d !== card.querySelector('.contact-details')) d.classList.add('hidden');
      });
      document.querySelectorAll('.contact-header svg, .user-header svg, .role-header svg').forEach(s => {
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

// Render users
function renderUsers(userList) {
  usersList.innerHTML = '';
  if (userList.length === 0) {
    usersEmptyState.classList.remove('hidden');
    return;
  }
  usersEmptyState.classList.add('hidden');
  userList.forEach(u => {
    const card = document.createElement('div');
    card.className = 'user-card contact-card';
    card.tabIndex = 0;
    const initials = (u.firstName[0] + (u.lastName ? u.lastName[0] : '')).toUpperCase();
    const isSuperAdmin = currentUser && currentUser.role === 'SuperAdmin';
    card.innerHTML = `
      <div class="user-header" data-id="${u.userId}">
        <div class="avatar">${initials}</div>
        <div class="flex-1">
          <div class="font-medium text-textPrimary">${sanitizeInput(u.firstName)} ${sanitizeInput(u.lastName || '')}</div>
          <div class="text-sm text-textSecondary">${sanitizeInput(u.userName)}</div>
        </div>
        <svg class="w-5 h-5 text-textSecondary transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>
      <div class="user-details contact-details hidden">
        <table class="w-full">
          <tr><th class="text-left text-textSecondary w-1/3">First Name</th><td>${sanitizeInput(u.firstName)}</td></tr>
          <tr><th class="text-left text-textSecondary">Last Name</th><td>${sanitizeInput(u.lastName || '')}</td></tr>
          <tr><th class="text-left text-textSecondary">Username</th><td>${sanitizeInput(u.userName)}</td></tr>
          <tr><th class="text-left text-textSecondary">Email</th><td>${sanitizeInput(u.email || '')}</td></tr>
          <tr><th class="text-left text-textSecondary">Phone</th><td>${sanitizeInput(u.phoneNumber || '')}</td></tr>
          <tr><th class="text-left text-textSecondary">Role</th><td>${sanitizeInput(u.role || '')}</td></tr>
        </table>
        <div class="mt-4 flex space-x-2 justify-end">
          ${isSuperAdmin ? `
          <select class="change-role w-1/2 p-2 border border-border rounded-lg bg-inputBg text-textPrimary focus:outline-none focus:ring-2 focus:ring-accent" data-id="${u.userId}">
            <option value="">Change Role</option>
            ${roles.map(r => `<option value="${r.userRoleId}" ${r.userRoleName === u.role ? 'selected' : ''}>${sanitizeInput(r.userRoleName)}</option>`).join('')}
          </select>
          ` : `
          <span class="text-textSecondary w-1/2 p-2">Role: ${sanitizeInput(u.role || 'None')}</span>
          `}
          <button class="delete-user-btn btn btn-delete" data-id="${u.userId}"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
    usersList.appendChild(card);

    card.querySelector('.user-header').onclick = () => {
      document.querySelectorAll('.contact-details, .user-details, .role-details').forEach(d => {
        if (d !== card.querySelector('.user-details')) d.classList.add('hidden');
      });
      document.querySelectorAll('.contact-header svg, .user-header svg, .role-header svg').forEach(s => {
        if (s !== card.querySelector('svg')) s.classList.remove('rotate-180');
      });
      const details = card.querySelector('.user-details');
      const arrow = card.querySelector('svg');
      details.classList.toggle('hidden');
      arrow.classList.toggle('rotate-180');
    };

    if (isSuperAdmin) {
      const select = card.querySelector('.change-role');
      if (select) {
        select.onchange = async (e) => {
          const userId = parseInt(e.target.dataset.id);
          const userRoleId = parseInt(e.target.value);
          if (userRoleId) {
            await changeUserRole(userId, userRoleId);
          }
        };
      }
    } else {
      const roleSpan = card.querySelector('.user-details span');
      if (roleSpan) {
        roleSpan.onclick = () => {
          showToast('Only SuperAdmins can change user roles.', 'error');
        };
      }
    }

    card.querySelector('.delete-user-btn').onclick = (e) => {
      e.stopPropagation();
      deleteUser(u.userId, u);
    };
  });
}

// Render roles with role-specific actions
function renderRoles(roleList) {
  rolesList.innerHTML = '';
  if (roleList.length === 0) {
    rolesEmptyState.classList.remove('hidden');
    return;
  }
  rolesEmptyState.classList.add('hidden');
  roleList.forEach(r => {
    const card = document.createElement('div');
    card.className = 'role-card contact-card';
    card.tabIndex = 0;
    const isSuperAdminRole = r.userRoleName === 'SuperAdmin';
    const isAdminRole = r.userRoleName === 'Admin';
    let actionsHtml = '';
    if (currentUser && currentUser.role === 'SuperAdmin') {
      actionsHtml += `<button class="edit-role-btn btn btn-edit" data-id="${r.userRoleId}"><i class="fas fa-edit"></i></button>`;
      if (!isSuperAdminRole) {
        actionsHtml += `<button class="delete-role-btn btn btn-delete" data-id="${r.userRoleId}"><i class="fas fa-trash"></i></button>`;
      }
    }
    if (isSuperAdminRole) {
      actionsHtml += `<button class="view-permissions-btn btn btn-secondary" data-id="${r.userRoleId}">View Permissions</button>`;
    } else if (isAdminRole) {
      actionsHtml += `<button class="assign-permissions-btn btn btn-secondary" data-id="${r.userRoleId}">Assign Permissions</button>`;
    }
    card.innerHTML = `
      <div class="role-header" data-id="${r.userRoleId}">
        <div class="flex-1">
          <div class="font-medium text-textPrimary">${sanitizeInput(r.userRoleName)}</div>
          <div class="text-sm text-textSecondary">${sanitizeInput(r.description || '')}</div>
        </div>
        <svg class="w-5 h-5 text-textSecondary transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>
      <div class="role-details contact-details hidden">
        <table class="w-full">
          <tr><th class="text-left text-textSecondary w-1/3">Role Name</th><td>${sanitizeInput(r.userRoleName)}</td></tr>
          <tr><th class="text-left text-textSecondary">Description</th><td>${sanitizeInput(r.description || '')}</td></tr>
        </table>
        <div class="mt-4 flex space-x-2 justify-end">
          ${actionsHtml}
        </div>
      </div>
    `;
    rolesList.appendChild(card);

    card.querySelector('.role-header').onclick = () => {
      document.querySelectorAll('.contact-details, .user-details, .role-details').forEach(d => {
        if (d !== card.querySelector('.role-details')) d.classList.add('hidden');
      });
      document.querySelectorAll('.contact-header svg, .user-header svg, .role-header svg').forEach(s => {
        if (s !== card.querySelector('svg')) s.classList.remove('rotate-180');
      });
      const details = card.querySelector('.role-details');
      const arrow = card.querySelector('svg');
      details.classList.toggle('hidden');
      arrow.classList.toggle('rotate-180');
    };

    if (currentUser && currentUser.role === 'SuperAdmin') {
      const editBtn = card.querySelector('.edit-role-btn');
      if (editBtn) {
        editBtn.onclick = (e) => {
          e.stopPropagation();
          editRole(r.userRoleId, r);
        };
      }
      const deleteBtn = card.querySelector('.delete-role-btn');
      if (deleteBtn) {
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          deleteRole(r.userRoleId, r);
        };
      }
    }

    const viewPermissionsBtn = card.querySelector('.view-permissions-btn');
    if (viewPermissionsBtn) {
      viewPermissionsBtn.onclick = (e) => {
        e.stopPropagation();
        viewPermissions(r.userRoleId, r.userRoleName);
      };
    }

    const assignPermissionsBtn = card.querySelector('.assign-permissions-btn');
    if (assignPermissionsBtn) {
      assignPermissionsBtn.onclick = (e) => {
        e.stopPropagation();
        assignPermissions(r.userRoleId, r.userRoleName);
      };
    }
  });
}

// Edit contact
function editContact(id, contact) {
  document.getElementById('contactId').value = contact.contactId;
  document.getElementById('contact-firstName').value = sanitizeInput(contact.firstName);
  document.getElementById('contact-lastName').value = sanitizeInput(contact.lastName || '');
  document.getElementById('contact-email').value = sanitizeInput(contact.email || '');
  document.getElementById('contact-phoneNumber').value = sanitizeInput(contact.phoneNumber || '');
  document.getElementById('contact-address').value = sanitizeInput(contact.address || '');
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
    showToast('Cannot connect to server.', 'error');
  } finally {
    hideSpinner();
  }
}

// Undo delete contact
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

// Delete user
async function deleteUser(id, user) {
  if (!confirm('Are you sure you want to delete this user?')) return;
  showSpinner();
  deletedUser = { id, user };
  try {
    const res = await makeAuthenticatedRequest(`${ADMIN_API_URL}/delete?userId=${id}`, 'DELETE');
    if (!res) return;
    if (res.ok) {
      showToast(`User deleted. <button onclick="undoDeleteUser()">Undo</button>`, 'success', false);
      fetchUsersByRole(searchUsers.value);
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || 'Failed to delete user', 'error');
    }
  } catch (err) {
    showToast('Cannot connect to server.', 'error');
  } finally {
    hideSpinner();
  }
}

// Undo delete user
async function undoDeleteUser() {
  if (!deletedUser) return;
  showSpinner();
  try {
    const { user } = deletedUser;
    const payload = {
      firstName: user.firstName,
      lastName: user.lastName || '',
      userName: user.userName,
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      role: user.role || ''
    };
    const res = await makeAuthenticatedRequest(`${AUTH_API_URL}/signUp`, 'POST', payload);
    if (!res) return;
    if (res.ok) {
      showToast('User restored!', 'success');
      fetchUsersByRole(searchUsers.value);
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || 'Failed to restore user', 'error');
    }
  } catch (err) {
    showToast('Cannot connect to server.', 'error');
  } finally {
    deletedUser = null;
    hideSpinner();
  }
}

// Change user role
async function changeUserRole(userId, userRoleId) {
  if (!currentUser || currentUser.role !== 'SuperAdmin') {
    showToast('Only SuperAdmins can change user roles.', 'error');
    return;
  }
  showSpinner();
  try {
    const res = await makeAuthenticatedRequest(`${ADMIN_API_URL}/changeRole?userId=${userId}&userRoleId=${userRoleId}`, 'PATCH');
    if (!res) return;
    if (res.ok) {
      showToast('User role updated!', 'success');
      fetchUsersByRole(searchUsers.value || 'User');
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || 'Failed to change user role', 'error');
    }
  } catch (err) {
    showToast('Cannot connect to server.', 'error');
  } finally {
    hideSpinner();
  }
}

// Edit role
function editRole(id, role) {
  if (currentUser && currentUser.role !== 'SuperAdmin') {
    showToast('Only SuperAdmins can edit roles.', 'error');
    return;
  }
  document.getElementById('role-id').value = id;
  document.getElementById('role-name').value = sanitizeInput(role.userRoleName);
  document.getElementById('role-description').value = sanitizeInput(role.description || '');
  roleSubmit.textContent = 'Update Role';
  roleModalTitle.textContent = 'Edit Role';
  roleModal.classList.remove('hidden');
}

// Delete role
async function deleteRole(id, role) {
  if (currentUser && currentUser.role !== 'SuperAdmin') {
    showToast('Only SuperAdmins can delete roles.', 'error');
    return;
  }
  if (!confirm('Are you sure you want to delete this role?')) return;
  showSpinner();
  deletedRole = { id, role };
  try {
    const res = await makeAuthenticatedRequest(`${ROLE_API_URL}/deleteById?userRoleId=${id}`, 'DELETE');
    if (!res) return;
    if (res.ok) {
      showToast(`Role deleted. <button onclick="undoDeleteRole()">Undo</button>`, 'success', false);
      fetchRoles();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || 'Failed to delete role', 'error');
    }
  } catch (err) {
    showToast('Cannot connect to server.', 'error');
  } finally {
    hideSpinner();
  }
}

// Undo delete role
async function undoDeleteRole() {
  if (!deletedRole) return;
  showSpinner();
  try {
    const { role } = deletedRole;
    const payload = {
      userRoleName: role.userRoleName,
      description: role.description || ''
    };
    const res = await makeAuthenticatedRequest(`${ROLE_API_URL}/post`, 'POST', payload);
    if (!res) return;
    if (res.ok) {
      showToast('Role restored!', 'success');
      fetchRoles();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || 'Failed to restore role', 'error');
    }
  } catch (err) {
    showToast('Cannot connect to server.', 'error');
  } finally {
    deletedRole = null;
    hideSpinner();
  }
}

// View permissions (placeholder)
function viewPermissions(roleId, roleName) {
  showToast(`Viewing permissions for ${sanitizeInput(roleName)} (ID: ${roleId})`, 'info');
  // Placeholder: Implement actual permissions fetching logic when API is available
}

// Assign permissions (placeholder)
function assignPermissions(roleId, roleName) {
  showToast(`Assigning permissions for ${sanitizeInput(roleName)} (ID: ${roleId})`, 'info');
  // Placeholder: Implement actual permissions assignment logic when API is available
}

// Show admin panel with section switching
function showAdminPanel(section = 'users') {
  authSection.classList.add('hidden');
  contactsSection.classList.add('hidden');
  adminSection.classList.remove('hidden');
  if (section === 'users') {
    manageUsersSection.classList.remove('hidden');
    manageRolesSection.classList.add('hidden');
    manageUsersBtn.classList.add('btn-active');
    manageRolesBtn.classList.remove('btn-active');
    fetchUsersByRole('User');
  } else {
    manageUsersSection.classList.add('hidden');
    manageRolesSection.classList.remove('hidden');
    manageUsersBtn.classList.remove('btn-active');
    manageRolesBtn.classList.add('btn-active');
    fetchRoles();
  }
}

// Logout
logoutBtn.onclick = async () => {
  showSpinner();
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    const res = await makeAuthenticatedRequest(`${AUTH_API_URL}/logout?token=${encodeURIComponent(refreshToken)}`, 'DELETE');
    if (!res) return;
    if (res.ok) {
      showToast('Logged out successfully!', 'success');
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || 'Logout failed.', 'error');
    }
  } catch (err) {
    showToast('Cannot connect to server.', 'error');
  } finally {
    localStorage.clear();
    contacts = [];
    users = [];
    roles = [];
    currentUser = null;
    adminPanelBtn.classList.add('hidden');
    addRoleContainer.classList.add('hidden');
    showAuth();
    hideSpinner();
    settingsDiv.classList.add('hidden');
  }
};

// Authenticated request
async function makeAuthenticatedRequest(url, method = 'GET', body = null) {
  const accessToken = localStorage.getItem('accessToken');
  const tokenType = localStorage.getItem('tokenType');
  const expires = parseInt(localStorage.getItem('expires'));
  const refreshToken = localStorage.getItem('refreshToken');

  if (!accessToken || !tokenType || !refreshToken) {
    showToast('Please sign in again.', 'error');
    showAuth();
    return null;
  }

  if (Date.now() > expires) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      showToast('Session expired. Please sign in again.', 'error');
      showAuth();
      return null;
    }
  } // 👈 this was missing

  const headers = {
    'Accept': `${tokenType} ${accessToken}`,
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + accessToken
  };

  try {
    let res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
    if (res.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
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
      showToast(data.error || 'Token refresh failed.', 'error');
      localStorage.clear();
      return false;
    }
  } catch (err) {
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
  adminSection.classList.add('hidden');
  authSection.classList.remove('hidden');
  signupForm.classList.add('hidden');
  signinForm.classList.remove('hidden');
}

// Show contacts section
function showContacts() {
  authSection.classList.add('hidden');
  adminSection.classList.add('hidden');
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