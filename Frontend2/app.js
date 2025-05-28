const API = 'https://localhost:7150/api';
let accessToken = localStorage.getItem('accessToken') || '';
let refreshToken = localStorage.getItem('refreshToken') || '';
let user = null;
let page = 1;
const pageSize = 10;
let selectedContacts = new Set();

const els = {
    loading: document.getElementById('loading'),
    authSection: document.getElementById('authSection'),
    homeSection: document.getElementById('homeSection'),
    contactsSection: document.getElementById('contactsSection'),
    adminSection: document.getElementById('adminSection'),
    rolesSection: document.getElementById('rolesSection'),
    authForm: document.getElementById('authForm'),
    authTitle: document.getElementById('authTitle'),
    signUpFields: document.getElementById('signUpFields'),
    authSubmit: document.getElementById('authSubmit'),
    toggleAuth: document.getElementById('toggleAuth'),
    userInfo: document.getElementById('userInfo'),
    userName: document.getElementById('userName'),
    logout: document.getElementById('logout'),
    contactForm: document.getElementById('contactForm'),
    contactList: document.getElementById('contactList'),
    userList: document.getElementById('userList'),
    roleList: document.getElementById('roleList'),
    userProfile: document.getElementById('userProfile'),
    themeBtn: document.getElementById('themeBtn'),
    themeIcon: document.getElementById('themeIcon'),
    menuToggle: document.getElementById('menuToggle'),
    mobileMenu: document.getElementById('mobileMenu'),
    togglePass: document.getElementById('togglePass'),
    eyeIcon: document.getElementById('eyeIcon'),
    contactSearch: document.getElementById('contactSearch'),
    contactSort: document.getElementById('contactSort'),
    prevPage: document.getElementById('prevPage'),
    nextPage: document.getElementById('nextPage'),
    pageInfo: document.getElementById('pageInfo'),
    contactReset: document.getElementById('contactReset'),
    exportCsv: document.getElementById('exportCsv'),
    bulkDelete: document.getElementById('bulkDelete'),
    getUsers: document.getElementById('getUsers'),
    changeRole: document.getElementById('changeRole'),
    deleteUser: document.getElementById('deleteUser'),
    roleForm: document.getElementById('roleForm')
};

let isSignUp = false;
let passVisible = false;

// Theme
if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
    els.themeIcon.setAttribute('d', 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z');
}
els.themeBtn.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    els.themeIcon.setAttribute('d', document.documentElement.classList.contains('dark')
        ? 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z'
        : 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z');
});

// Mobile Menu
els.menuToggle.addEventListener('click', () => els.mobileMenu.classList.toggle('hidden'));

// Password Toggle
els.togglePass.addEventListener('click', () => {
    passVisible = !passVisible;
    document.getElementById('password').type = passVisible ? 'text' : 'password';
    els.eyeIcon.setAttribute('d', passVisible
        ? 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12a4.5 4.5 0 110-9 4.5 4.5 0 010 9zm0-7a2.5 2.5 0 000 5 2.5 2.5 0 000-5z'
        : 'M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.627 0c-1.297 2.246-3.92 4-9.627 4-5.707 0-8.33-1.754-9.627-4 1.297-2.246 3.92-4 9.627-4 5.707 0 8.33 1.754 9.627 4z');
});

// Check Login
if (accessToken) {
    showLoading();
    fetchUser().finally(hideLoading);
} else {
    els.authSection.classList.remove('hidden');
}

// Auth Toggle
els.toggleAuth.addEventListener('click', () => {
    isSignUp = !isSignUp;
    els.authTitle.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    els.signUpFields.classList.toggle('hidden', !isSignUp);
    els.authSubmit.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    els.toggleAuth.textContent = isSignUp ? 'Sign In' : 'Sign Up';
    els.authForm.reset();
});

// Auth Submit
els.authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateAuth()) return;
    showLoading();
    try {
        if (isSignUp) {
            const data = {
                firstName: document.getElementById('firstName').value.trim(),
                lastName: document.getElementById('lastName').value.trim(),
                email: document.getElementById('email').value.trim(),
                phoneNumber: document.getElementById('phone').value.trim(),
                userName: document.getElementById('userName').value.trim(),
                password: document.getElementById('password').value.trim()
            };
            const res = await fetch(`${API}/auth/sighUp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'accept': '*/*' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                isSignUp = false;
                els.authTitle.textContent = 'Sign In';
                els.signUpFields.classList.add('hidden');
                els.authSubmit.textContent = 'Sign In';
                els.toggleAuth.textContent = 'Sign Up';
                els.authForm.reset();
                Swal.fire({ icon: 'success', text: 'Sign-up successful! Please sign in.', timer: 1000 });
            } else {
                Swal.fire({ icon: 'error', text: await res.text() || 'Sign-up failed.' });
            }
        } else {
            const data = {
                userName: document.getElementById('userName').value.trim(),
                password: document.getElementById('password').value.trim()
            };
            const res = await fetch(`${API}/auth/signIn`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'accept': '*/*' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                const { accessToken: at, refreshToken: rt } = await res.json();
                accessToken = at;
                refreshToken = rt;
                localStorage.setItem('accessToken', at);
                localStorage.setItem('refreshToken', rt);
                await fetchUser();
                showSection('home');
                Swal.fire({ icon: 'success', text: 'Signed in!', timer: 1000 });
            } else if (res.status === 403) {
                Swal.fire({ icon: 'error', text: 'API restricted (9 AM–6 PM).' });
            } else {
                Swal.fire({ icon: 'error', text: await res.text() || 'Invalid credentials.' });
            }
        }
    } catch {
        Swal.fire({ icon: 'error', text: 'Network error.' });
    } finally {
        hideLoading();
    }
});

// Validate Auth
function validateAuth() {
    const userName = document.getElementById('userName').value.trim();
    const password = document.getElementById('password').value.trim();
    if (isSignUp) {
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        if (!firstName || !lastName || !email || !phone || !userName || !password) {
            Swal.fire({ icon: 'warning', text: 'All fields required.' });
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            Swal.fire({ icon: 'warning', text: 'Invalid email.' });
            return false;
        }
        if (!/^\+?\d{10,15}$/.test(phone)) {
            Swal.fire({ icon: 'warning', text: 'Invalid phone.' });
            return false;
        }
    }
    if (!userName || !password) {
        Swal.fire({ icon: 'warning', text: 'Username and password required.' });
        return false;
    }
    return true;
}

// Fetch User
async function fetchUser() {
    const res = await fetchWithToken(`${API}/auth/getUser`);
    if (res.ok) {
        user = await res.json();
        els.userName.textContent = `${user.userName} (${user.role || 'User'})`;
        els.userInfo.classList.remove('hidden');
        els.userProfile.innerHTML = `
            <div class="fade">
                <p>ID: ${user.userId || 'N/A'}</p>
                <p>Name: ${user.firstName || ''} ${user.lastName || ''}</p>
                <p>Email: ${user.email || 'N/A'}</p>
                <p>Phone: ${user.phoneNumber || 'N/A'}</p>
                <p>Role: ${user.role || 'N/A'}</p>
            </div>
        `;
        const isAdmin = ['admin', 'super admin'].includes(user.role);
        els.contactsSection.classList.toggle('hidden', !isAdmin);
        els.adminSection.classList.toggle('hidden', !isAdmin);
        els.rolesSection.classList.toggle('hidden', !isAdmin);
        ['navContacts', 'navAdmin', 'navRoles', 'navContactsMobile', 'navAdminMobile', 'navRolesMobile']
            .forEach(id => document.getElementById(id).classList.toggle('hidden', !isAdmin));
        if (isAdmin) {
            fetchContacts();
            fetchRoles();
        }
    } else {
        await refreshToken();
    }
}

// Show Section
function showSection(section) {
    ['authSection', 'homeSection', 'contactsSection', 'adminSection', 'rolesSection']
        .forEach(s => els[s].classList.toggle('hidden', s !== `${section}Section`));
    els.homeSection.classList.toggle('hidden', section !== 'home' && accessToken);
    els.authSection.classList.toggle('hidden', section !== 'home' && !accessToken);
    if (section === 'contacts' && ['admin', 'super admin'].includes(user?.role)) fetchContacts();
    if (section === 'roles' && ['admin', 'super admin'].includes(user?.role)) fetchRoles();
}

// Refresh Token
async function refreshToken() {
    try {
        const res = await fetch(`${API}/auth/refreshToken`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'accept': '*/*' },
            body: JSON.stringify({ accessToken, refreshToken })
        });
        if (res.ok) {
            const { accessToken: at, refreshToken: rt } = await res.json();
            accessToken = at;
            refreshToken = rt;
            localStorage.setItem('accessToken', at);
            localStorage.setItem('refreshToken', rt);
            await fetchUser();
        } else {
            localStorage.clear();
            Swal.fire({ icon: 'error', text: 'Session expired. Please sign in.', timer: 1000 });
            showSection('auth');
        }
    } catch {
        Swal.fire({ icon: 'error', text: 'Network error.' });
    }
}

// Fetch with Token
async function fetchWithToken(url, options = {}) {
    options.headers = { ...options.headers, 'Authorization': `Bearer ${accessToken}`, 'accept': '*/*' };
    showLoading();
    try {
        const res = await fetch(url, options);
        if (res.status === 401) {
            await refreshToken();
            return fetchWithToken(url, options);
        } else if (res.status === 403) {
            Swal.fire({ icon: 'error', text: 'API restricted (9 AM–6 PM).' });
            throw new Error('Forbidden');
        }
        return res;
    } catch {
        Swal.fire({ icon: 'error', text: 'Network error.' });
        throw new Error('Network error');
    } finally {
        hideLoading();
    }
}

// Loading
function showLoading() { els.loading.classList.remove('hidden'); }
function hideLoading() { els.loading.classList.add('hidden'); }

// Logout
els.logout.addEventListener('click', async () => {
    showLoading();
    try {
        await fetchWithToken(`${API}/auth/LogOut?token=${encodeURIComponent(accessToken)}`, { method: 'DELETE' });
        localStorage.clear();
        accessToken = '';
        refreshToken = '';
        Swal.fire({ icon: 'success', text: 'Logged out.', timer: 1000 });
        showSection('auth');
    } catch {
        Swal.fire({ icon: 'error', text: 'Logout failed.' });
    } finally {
        hideLoading();
    }
});

// Contact Form
els.contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateContact()) return;
    showLoading();
    try {
        const id = document.getElementById('contactId').value;
        const data = {
            firstName: document.getElementById('contactFirstName').value.trim(),
            lastName: document.getElementById('contactLastName').value.trim(),
            email: document.getElementById('contactEmail').value.trim(),
            phoneNumber: document.getElementById('contactPhone').value.trim(),
            address: document.getElementById('contactAddress').value.trim()
        };
        if (id) data.contactId = parseInt(id);
        data.fullName = `${data.firstName} ${data.lastName}`;
        const url = id ? `${API}/contact/update` : `${API}/contact/post`;
        const method = id ? 'PUT' : 'POST';
        const res = await fetchWithToken(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            els.contactForm.reset();
            document.getElementById('contactId').value = '';
            els.contactSubmit.textContent = 'Add';
            fetchContacts();
            Swal.fire({ icon: 'success', text: id ? 'Contact updated!' : 'Contact added!', timer: 1000 });
        } else {
            Swal.fire({ icon: 'error', text: 'Contact operation failed.' });
        }
    } catch {
        Swal.fire({ icon: 'error', text: 'Network error.' });
    } finally {
        hideLoading();
    }
});

// Validate Contact
function validateContact() {
    const firstName = document.getElementById('contactFirstName').value.trim();
    const lastName = document.getElementById('contactLastName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const address = document.getElementById('contactAddress').value.trim();
    if (!firstName || !lastName || !email || !phone || !address) {
        Swal.fire({ icon: 'warning', text: 'All fields required.' });
        return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        Swal.fire({ icon: 'warning', text: 'Invalid email.' });
        return false;
    }
    if (!/^\+?\d{10,15}$/.test(phone)) {
        Swal.fire({ icon: 'warning', text: 'Invalid phone.' });
        return false;
    }
    return true;
}

// Fetch Contacts
async function fetchContacts(p = page) {
    if (!['admin', 'super admin'].includes(user?.role)) return;
    showLoading();
    try {
        const res = await fetchWithToken(`${API}/contact/getAll`);
        if (res.ok) {
            let contacts = await res.json();
            const search = els.contactSearch.value.trim().toLowerCase();
            const sort = els.contactSort.value;
            contacts = contacts.filter(c =>
                (c.fullName?.toLowerCase().includes(search) || c.email?.toLowerCase().includes(search))
            );
            contacts.sort((a, b) => {
                if (sort === 'name-asc') return (a.fullName || '').localeCompare(b.fullName || '');
                if (sort === 'name-desc') return (b.fullName || '').localeCompare(a.fullName || '');
                if (sort === 'email-asc') return (a.email || '').localeCompare(b.email || '');
                if (sort === 'email-desc') return (b.email || '').localeCompare(a.email || '');
                return 0;
            });
            const totalPages = Math.ceil(contacts.length / pageSize);
            const start = (p - 1) * pageSize;
            const paginated = contacts.slice(start, start + pageSize);
            els.contactList.innerHTML = `
                <div class="table-responsive">
                    <table class="w-full hidden sm:table text-sm">
                        <thead class="bg-gray-200 dark:bg-gray-700">
                            <tr>
                                <th class="p-2"><input type="checkbox" id="selectAll" aria-label="Select all"></th>
                                <th class="p-2">Name</th>
                                <th class="p-2">Email</th>
                                <th class="p-2">Phone</th>
                                <th class="p-2">Address</th>
                                <th class="p-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${paginated.map(c => `
                                <tr class="border-b dark:border-gray-600">
                                    <td class="p-2"><input type="checkbox" class="contact-check" data-id="${c.contactId}" aria-label="Select contact"></td>
                                    <td class="p-2">${c.fullName || ''}</td>
                                    <td class="p-2">${c.email || ''}</td>
                                    <td class="p-2">${c.phoneNumber || ''}</td>
                                    <td class="p-2">${c.address || ''}</td>
                                    <td class="p-2">
                                        <button onclick="editContact(${c.contactId}, '${c.firstName || ''}', '${c.lastName || ''}', '${c.email || ''}', '${c.phoneNumber || ''}', '${c.address || ''}')" class="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 text-xs">Edit</button>
                                        <button onclick="deleteContact(${c.contactId})" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-xs">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="cards space-y-2 sm:hidden">
                        ${paginated.map(c => `
                            <div class="card bg-white dark:bg-gray-800 p-3 rounded shadow">
                                <input type="checkbox" class="contact-check" data-id="${c.contactId}" aria-label="Select contact">
                                <p><strong>${c.fullName || ''}</strong></p>
                                <p>Email: ${c.email || ''}</p>
                                <p>Phone: ${c.phoneNumber || ''}</p>
                                <p>Address: ${c.address || ''}</p>
                                <div class="flex gap-2 mt-2">
                                    <button onclick="editContact(${c.contactId}, '${c.firstName || ''}', '${c.lastName || ''}', '${c.email || ''}', '${c.phoneNumber || ''}', '${c.address || ''}')" class="flex-1 bg-blue-500 text-white p-1 rounded hover:bg-blue-600 text-xs">Edit</button>
                                    <button onclick="deleteContact(${c.contactId})" class="flex-1 bg-red-500 text-white p-1 rounded hover:bg-red-600 text-xs">Delete</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            els.pageInfo.textContent = `Page ${p} of ${totalPages || 1}`;
            els.prevPage.disabled = p === 1;
            els.nextPage.disabled = p >= totalPages;
            els.contactList.classList.add('fade');
            setupCheckboxListeners();
            els.bulkDelete.classList.toggle('hidden', !selectedContacts.size);
        } else {
            Swal.fire({ icon: 'error', text: 'Failed to fetch contacts.' });
        }
    } catch {
        Swal.fire({ icon: 'error', text: 'Network error.' });
    } finally {
        hideLoading();
    }
}

// Checkbox Listeners
function setupCheckboxListeners() {
    const selectAll = document.getElementById('selectAll');
    const checks = document.querySelectorAll('.contact-check');
    selectAll?.addEventListener('change', () => {
        checks.forEach(c => {
            c.checked = selectAll.checked;
            const id = parseInt(c.dataset.id);
            if (c.checked) selectedContacts.add(id);
            else selectedContacts.delete(id);
        });
        els.bulkDelete.classList.toggle('hidden', !selectedContacts.size);
    });
    checks.forEach(c => {
        c.addEventListener('change', () => {
            const id = parseInt(c.dataset.id);
            if (c.checked) selectedContacts.add(id);
            else selectedContacts.delete(id);
            els.bulkDelete.classList.toggle('hidden', !selectedContacts.size);
            selectAll.checked = selectedContacts.size === checks.length;
        });
    });
}

// Contact Events
els.contactSearch.addEventListener('input', () => { page = 1; fetchContacts(); });
els.contactSort.addEventListener('change', () => { page = 1; fetchContacts(); });
els.prevPage.addEventListener('click', () => { if (page > 1) page--; fetchContacts(); });
els.nextPage.addEventListener('click', () => { page++; fetchContacts(); });
els.contactReset.addEventListener('click', () => {
    els.contactForm.reset();
    document.getElementById('contactId').value = '';
    els.contactSubmit.textContent = 'Add';
});

// Edit Contact
function editContact(id, firstName, lastName, email, phone, address) {
    document.getElementById('contactId').value = id;
    document.getElementById('contactFirstName').value = firstName;
    document.getElementById('contactLastName').value = lastName;
    document.getElementById('contactEmail').value = email;
    document.getElementById('contactPhone').value = phone;
    document.getElementById('contactAddress').value = address;
    els.contactSubmit.textContent = 'Update';
    window.scrollTo({ top: els.contactsSection.offsetTop, behavior: 'smooth' });
}

// Delete Contact
async function deleteContact(id) {
    Swal.fire({
        text: 'Delete this contact?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetchWithToken(`${API}/contact/delete?contactId=${id}`, { method: 'DELETE' });
                if (res.ok) {
                    fetchContacts();
                    Swal.fire({ icon: 'success', text: 'Contact deleted!', timer: 1000 });
                } else {
                    Swal.fire({ icon: 'error', text: 'Failed to delete contact.' });
                }
            } catch {
                Swal.fire({ icon: 'error', text: 'Network error.' });
            }
        }
    });
}

// Bulk Delete
els.bulkDelete.addEventListener('click', () => {
    if (!selectedContacts.size) return;
    Swal.fire({
        text: `Delete ${selectedContacts.size} contacts?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete'
    }).then(async (result) => {
        if (result.isConfirmed) {
            showLoading();
            try {
                for (const id of selectedContacts) {
                    await fetchWithToken(`${API}/contact/delete?contactId=${id}`, { method: 'DELETE' });
                }
                selectedContacts.clear();
                fetchContacts();
                Swal.fire({ icon: 'success', text: 'Contacts deleted!', timer: 1000 });
            } catch {
                Swal.fire({ icon: 'error', text: 'Failed to delete contacts.' });
            } finally {
                hideLoading();
            }
        }
    });
});

// Export CSV
els.exportCsv.addEventListener('click', async () => {
    try {
        const res = await fetchWithToken(`${API}/contact/getAll`);
        if (res.ok) {
            const contacts = await res.json();
            const csv = [
                ['ID', 'Name', 'Email', 'Phone', 'Address'],
                ...contacts.map(c => [
                    c.contactId || '',
                    c.fullName || '',
                    c.email || '',
                    c.phoneNumber || '',
                    c.address || ''
                ])
            ].map(row => row.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'contacts.csv';
            a.click();
            window.URL.revokeObjectURL(url);
            Swal.fire({ icon: 'success', text: 'Contacts exported!', timer: 1000 });
        } else {
            Swal.fire({ icon: 'error', text: 'Failed to export contacts.' });
        }
    } catch {
        Swal.fire({ icon: 'error', text: 'Network error.' });
    }
});

// Get Users
els.getUsers.addEventListener('click', async () => {
    try {
        const role = document.getElementById('roleFilter').value.trim();
        if (!role) {
            Swal.fire({ icon: 'warning', text: 'Role required.' });
            return;
        }
        const res = await fetchWithToken(`${API}/admin/getUsersByRole?role=${encodeURIComponent(role)}`);
        if (res.ok) {
            const users = await res.json();
            els.userList.innerHTML = `
                <div class="table-responsive">
                    <table class="w-full hidden sm:table text-sm">
                        <thead class="bg-gray-200 dark:bg-gray-700">
                            <tr>
                                <th class="p-2">Username</th>
                                <th class="p-2">Name</th>
                                <th class="p-2">Email</th>
                                <th class="p-2">Phone</th>
                                <th class="p-2">Role</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(u => `
                                <tr class="border-b dark:border-gray-600">
                                    <td class="p-2">${u.userName || ''}</td>
                                    <td class="p-2">${u.firstName || ''} ${u.lastName || ''}</td>
                                    <td class="p-2">${u.email || ''}</td>
                                    <td class="p-2">${u.phoneNumber || ''}</td>
                                    <td class="p-2">${u.role || ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="cards space-y-2 sm:hidden">
                        ${users.map(u => `
                            <div class="bg-white dark:bg-gray-800 p-3 rounded shadow">
                                <p><strong>${u.userName || ''}</strong> (${u.role || ''})</p>
                                <p>Name: ${u.firstName || ''} ${u.lastName || ''}</p>
                                <p>Email: ${u.email || ''}</p>
                                <p>Phone: ${u.phoneNumber || ''}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            els.userList.classList.add('fade');
        } else {
            Swal.fire({ icon: 'error', text: 'Failed to fetch users.' });
        }
    } catch {
        Swal.fire({ icon: 'error', text: 'Network error.' });
    }
});

// Change Role
els.changeRole.addEventListener('click', async () => {
    try {
        const userId = document.getElementById('changeUserId').value.trim();
        const roleId = document.getElementById('changeRoleId').value.trim();
        if (!userId || !roleId) {
            Swal.fire({ icon: 'warning', text: 'User ID and Role ID required.' });
            return;
        }
        const res = await fetchWithToken(`${API}/admin/changeRole?userId=${userId}&userRoleId=${roleId}`, { method: 'PATCH' });
        if (res.ok) {
            document.getElementById('changeUserId').value = '';
            document.getElementById('changeRoleId').value = '';
            Swal.fire({ icon: 'success', text: 'Role updated!', timer: 1000 });
        } else {
            Swal.fire({ icon: 'error', text: 'Failed to update role.' });
        }
    } catch {
        Swal.fire({ icon: 'error', text: 'Network error.' });
    }
});

// Delete User
els.deleteUser.addEventListener('click', async () => {
    try {
        const userId = document.getElementById('deleteUserId').value.trim();
        if (!userId) {
            Swal.fire({ icon: 'warning', text: 'User ID required.' });
            return;
        }
        const res = await fetchWithToken(`${API}/admin/delete?userId=${userId}`, { method: 'DELETE' });
        if (res.ok) {
            document.getElementById('deleteUserId').value = '';
            Swal.fire({ icon: 'success', text: 'User deleted!', timer: 1000 });
        } else {
            Swal.fire({ icon: 'error', text: 'Failed to delete user.' });
        }
    } catch {
        Swal.fire({ icon: 'error', text: 'Network error.' });
    }
});

// Role Form
els.roleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const name = document.getElementById('roleName').value.trim();
        const desc = document.getElementById('roleDesc').value.trim();
        if (!name || !desc) {
            Swal.fire({ icon: 'warning', text: 'Role name and description required.' });
            return;
        }
        const res = await fetchWithToken(`${API}/role/post`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userRoleName: name, description: desc })
        });
        if (res.ok) {
            els.roleForm.reset();
            fetchRoles();
            Swal.fire({ icon: 'success', text: `Role '${name}' created!`, timer: 1000 });
        } else {
            Swal.fire({ icon: 'error', text: 'Failed to create role.' });
        }
    } catch {
        Swal.fire({ icon: 'error', text: 'Network error.' });
    }
});

// Fetch Roles
async function fetchRoles() {
    try {
        const res = await fetchWithToken(`${API}/role/getAll`);
        if (res.ok) {
            const roles = await res.json();
            els.roleList.innerHTML = `
                <div class="table-responsive">
                    <table class="w-full hidden sm:table text-sm">
                        <thead class="bg-gray-200 dark:bg-gray-700">
                            <tr>
                                <th class="p-2">ID</th>
                                <th class="p-2">Name</th>
                                <th class="p-2">Description</th>
                                ${user.role === 'super admin' ? '<th class="p-2">Actions</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${roles.map(r => `
                                <tr class="border-b dark:border-gray-600">
                                    <td class="p-2">${r.userRoleId || ''}</td>
                                    <td class="p-2">${r.userRoleName || ''}</td>
                                    <td class="p-2">${r.description || ''}</td>
                                    ${user.role === 'super admin' ? `
                                        <td class="p-2">
                                            <button onclick="deleteRole(${r.userRoleId})" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-xs">Delete</button>
                                        </td>
                                    ` : ''}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="cards space-y-2 sm:hidden">
                        ${roles.map(r => `
                            <div class="bg-white dark:bg-gray-800 p-3 rounded shadow">
                                <p><strong>${r.userRoleName || ''}</strong> (ID: ${r.userRoleId})</p>
                                <p>${r.description || ''}</p>
                                ${user.role === 'super admin' ? `
                                    <button onclick="deleteRole(${r.userRoleId})" class="bg-red-500 text-white p-1 rounded w-full mt-2 hover:bg-red-600 text-xs">Delete</button>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            els.roleList.classList.add('fade');
        } else {
            Swal.fire({ icon: 'error', text: 'Failed to fetch roles.' });
        }
    } catch {
        Swal.fire({ icon: 'error', text: 'Network error.' });
    }
}

// Delete Role
async function deleteRole(id) {
    Swal.fire({
        text: 'Delete this role?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetchWithToken(`${API}/role/deleteById?userRoleId=${id}`, { method: 'DELETE' });
                if (res.ok) {
                    fetchRoles();
                    Swal.fire({ icon: 'success', text: 'Role deleted!', timer: 1000 });
                } else {
                    Swal.fire({ icon: 'error', text: 'Failed to delete role.' });
                }
            } catch {
                Swal.fire({ icon: 'error', text: 'Network error.' });
            }
        }
    });
}

// Offline
window.addEventListener('offline', () => Swal.fire({ icon: 'warning', text: 'Offline.', timer: 1000 }));
window.addEventListener('online', () => Swal.fire({ icon: 'success', text: 'Online!', timer: 1000 }));

// Auto-refresh Token
setInterval(async () => {
    if (accessToken && refreshToken) {
        try {
            await refreshToken();
        } catch {
            console.error('Token refresh failed');
        }
    }
}, 55 * 60 * 1000);