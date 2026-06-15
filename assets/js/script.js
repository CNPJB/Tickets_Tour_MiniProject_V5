// Responsive Navbar JS
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.navbar ul');

menuToggle.addEventListener('click', () => {
  navLinks.classList.toggle('active');
});

// Dropdown Toggle
document.querySelectorAll('.nav-dropdown > a').forEach(dropdownToggle => {
  dropdownToggle.addEventListener('click', function (e) {
    e.preventDefault(); // กันลิงก์กระโดด
    const parentLi = this.parentElement;

    // toggle active
    parentLi.classList.toggle('active');
  });

});

// Register Modal & API Logic
document.addEventListener('DOMContentLoaded', function () {
  const registerBtn = document.querySelector('.btn-register');
  const modal = document.getElementById('registerModal');
  const closeModal = document.getElementById('closeRegisterModal');
  const registerForm = document.getElementById('registerForm');
  const registerMsg = document.getElementById('registerMsg');

  // Show modal
  registerBtn.addEventListener('click', function (e) {
    e.preventDefault();
    modal.style.display = 'block';
    registerMsg.textContent = '';
    registerForm.reset();
  });

  // Close modal
  closeModal.addEventListener('click', function () {
    modal.style.display = 'none';
  });

  // Submit register form
  registerForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    try {
      const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if (res.ok) {
        registerMsg.style.color = 'green';
        registerMsg.textContent = 'Register success!';
        setTimeout(() => { modal.style.display = 'none'; showLoginModal(); }, 1200);
      } else {
        registerMsg.style.color = 'red';
        registerMsg.textContent = data.message || 'Register failed';
      }
    } catch (err) {
      registerMsg.style.color = 'red';
      registerMsg.textContent = 'Server error';
    }
  });
});

// Login Modal & Auth UI Logic
document.addEventListener('DOMContentLoaded', function () {
  const loginBtn = document.querySelector('.btn-login');
  const navAuth = document.querySelector('.nav-auth');
  const modal = document.getElementById('loginModal');
  const closeModal = document.getElementById('closeLoginModal');
  const loginForm = document.getElementById('loginForm');
  const loginMsg = document.getElementById('loginMsg');

  // Show modal
  if (loginBtn) {
    loginBtn.addEventListener('click', function (e) {
      e.preventDefault();
      modal.style.display = 'block';
      loginMsg.textContent = '';
      loginForm.reset();
    });
  }

  // Close modal
  if (closeModal) {
    closeModal.onclick = function () {
      modal.style.display = 'none';
    };
  }

  // Login form submit
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const usernameOrEmail = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;
      try {
        const res = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernameOrEmail, password }),
          credentials: 'include'
        });
        const data = await res.json();
        if (res.ok) {
          // โหลด user จาก session
          await showUserUI();
          modal.style.display = 'none';
          // Refresh Browser
          window.location.reload();
        } else {
          loginMsg.style.color = 'red';
          loginMsg.textContent = data.message || 'Login failed';
        }
      } catch (err) {
        loginMsg.style.color = 'red';
        loginMsg.textContent = 'Server error';
      }
    });
  }
  // Show user UI if already logged in
  showUserUI();

  async function showUserUI() {
    try {
      const res = await fetch('/me',
        { credentials: 'include' }
      );
      if (!res.ok) return;
      const data = await res.json();
      const user = data.user;
      if (!navAuth) return;
      navAuth.innerHTML = `
    <a href="#" class="btn-admin" style="display:none;">Admin</a> 
    <div class="user-mini">
      👤${user.username || user.email}  | ID: ${user.id}
      <button id="logoutBtn" style="margin-left:10px; padding:0.2em 0.8em; 
      border-radius:12px; border:none; background:#f44336; color:#fff; 
      cursor:pointer;">Logout</button>
    </div>`;
      updateAdminButton(user);
      // hide admin sidebar items for staff users
      hideUIForStaff(user);

      document.getElementById('logoutBtn').onclick = async function () {
        await fetch('/logout', {
          method: 'POST',
          credentials: 'include'
        });
        location.reload();
      };
    } catch (err) {
      console.error('Error fetching user info:', err);
    }
  }
});

// Show Admin button only for admin users
function updateAdminButton(user) {
  const adminBtns = document.querySelectorAll('.btn-admin');
  adminBtns.forEach(btn => {
    if (!user) {
      btn.style.display = 'none';
    } else if (user.role === 1) {
      btn.style.display = '';
      btn.onclick = (e) => {
        e.preventDefault();
        window.location.href = '/admin';
      };
    } else if (user.role === 3) {
      btn.style.display = '';
      btn.onclick = (e) => {
        e.preventDefault();
        window.location.href = '/admin-tickets';
      };
    } else {
      btn.style.display = 'none';
    }
  });
}

// Hide UI Admin button for staff users
function hideUIForStaff(user) {
  // safe access to DOM elements (IDs should be without '#')
  const adminUserSidebar = document.getElementById('admin-user-sidebar');
  const adminTourSidebar = document.getElementById('admin-tour-sidebar');

  if (!user) return;

  if (user.role === 3) {
    if (adminUserSidebar) adminUserSidebar.style.display = 'none';
    if (adminTourSidebar) adminTourSidebar.style.display = 'none';
  } else {
    if (adminUserSidebar) adminUserSidebar.style.display = '';
    if (adminTourSidebar) adminTourSidebar.style.display = '';
  }
}

//  hideUIForStaff & updateAdminButton on DOM load
document.addEventListener('DOMContentLoaded', function () {
  updateAdminButton();
  hideUIForStaff();
});

// Show Login Modal
function showLoginModal() {
  const loginModal = document.getElementById('loginModal');
  const loginForm = document.getElementById('loginForm');
  const loginMsg = document.getElementById('loginMsg');

  if (!loginModal) return;

  loginMsg.textContent = '';
  loginForm.reset();
  loginModal.style.display = 'block';
}
/////////////////////////////

/////////////////////////////
// Admin - Manage User script
document.addEventListener("DOMContentLoaded", function () {
  const usersTableBody = document.querySelector("#usersTable tbody");
  const adminMsg = document.getElementById("adminMsg");

  const editForm = document.getElementById("editUserForm");
  const editId = document.getElementById("edit-id");
  const editUsername = document.getElementById("edit-username");
  const editEmail = document.getElementById("edit-email");
  const editRole = document.getElementById("edit-role");
  async function loadUsers() {
    usersTableBody.innerHTML = "";
    adminMsg.textContent = "";
    try {
      const res = await fetch("/getusers", {
        credentials: "include",
      });
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        adminMsg.style.color = "#e53935";
        adminMsg.textContent =
          "Session expired, not admin, or server error.";
        return;
      }
      const users = await res.json();
      users.forEach((user) => {
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.role_name}</td>
             `;
          
        // event: click ทั้งแถว
        tr.addEventListener("click", () => {
          editId.value = user.id;
          editUsername.value = user.username;
          editEmail.value = user.email;
          editRole.value = user.role_name;
        });

        usersTableBody.appendChild(tr);
      });
    } catch (err) {
      adminMsg.textContent = err.message;
    }
  }
  loadUsers();

  // Update user event
  document
    .getElementById("uptUserBtn")
    .addEventListener("click", async () => {
      const updatedUser = {
        username: editUsername.value.trim(),
        email: editEmail.value.trim(),
        role_id: editRole.value.trim(),
      };

      // ===== Validate =====
      if (!updatedUser.username) {
        adminMsg.style.color = "#e53935";
        adminMsg.textContent = "Username cannot be empty.";
        setTimeout(() => { adminMsg.textContent = "" }, 2500);
        return;
      }

      // Email regex แบบง่าย
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updatedUser.email)) {
        adminMsg.style.color = "#e53935";
        adminMsg.textContent = "Invalid email format.";
        setTimeout(() => { adminMsg.textContent = "" }, 2500);
        return;
      }

      // Convert role_id เป็น number ก่อนส่ง
      const roleNum = parseInt(updatedUser.role_id);
      updatedUser.role_id = roleNum;

      adminMsg.textContent = ""; // เคลียร์ข้อความเก่า

      // ===== ส่งข้อมูลไป backend =====
      try {
        const res = await fetch(`/updateuser/${editId.value}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(updatedUser),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Update failed");

        loadUsers();

        adminMsg.style.color = "green";
        adminMsg.textContent = `User ${data.user.username} updated successfully.`;

        // เคลียร์ช่อง input
        editId.value = "";
        editUsername.value = "";
        editEmail.value = "";
        editRole.value = "";
        setTimeout(() => { adminMsg.textContent = "" }, 2500);
      } catch (err) {
        adminMsg.textContent = err.message;
      }
    });

  // Delete user event
  document
    .getElementById("delUserBtn")
    .addEventListener("click", async () => {
      if (!editId.value) {
        adminMsg.style.color = "#e53935";
        adminMsg.textContent = "Select a user to delete.";
        setTimeout(() => { adminMsg.textContent = "" }, 2500);
        return;
      }

      if (
        !confirm(
          `Are you sure you want to delete user ID ${editId.value}?`
        )
      )
        return;

      adminMsg.textContent = ""; // เคลียร์ข้อความเก่า

      try {
        const res = await fetch(`/deleteuser/${editId.value}`, {
          method: "DELETE",
          credentials: "include",
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Delete failed");

        loadUsers();

        adminMsg.style.color = "green";
        adminMsg.textContent = `User ID ${editId.value} deleted successfully.`;

        // เคลียร์ช่อง input
        editId.value = "";
        editUsername.value = "";
        editEmail.value = "";
        editRole.value = "";
        setTimeout(() => { adminMsg.textContent = "" }, 2500);
      } catch (err) {
        adminMsg.textContent = err.message;
      }
    });
});

// ฟังก์ชันแสดง popup ยืนยันการจอง
function openBookingConfirmModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById("booking-confirm-modal");
    const confirmBtn = document.getElementById("booking-confirm-btn");
    const cancelBtn = document.getElementById("booking-cancel-btn");
    const closeBtn = modal.querySelector(".booking-close");

    if (!modal) {
      console.error("booking-confirm-modal not found!");
      return resolve(false);
    }

    modal.style.display = "flex";

    const handleConfirm = () => { cleanup(); resolve(true); };
    const handleCancel = () => { cleanup(); resolve(false); };

    function cleanup() {
      modal.style.display = "none";
      confirmBtn.removeEventListener("click", handleConfirm);
      cancelBtn.removeEventListener("click", handleCancel);
      closeBtn.removeEventListener("click", handleCancel);
    }

    confirmBtn.addEventListener("click", handleConfirm);
    cancelBtn.addEventListener("click", handleCancel);
    closeBtn.addEventListener("click", handleCancel);
  });
}

// Fetch and display tours
window.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('toursContainer');
  const tourType = document.body.dataset.tourType;
  if (!toursContainer) return;
  try {
    const res = await fetch(`/api/tours?type=${encodeURIComponent(tourType)}`);
    const tours = await res.json();

    tours.forEach(t => {
      if (t.tour_status === 'canceled' || t.tour_status === 'completed') {
        return; // ข้าม tour นี้ไปเลย
      }
      const tourHTML = `
        <h1 class="header-Tours">${t.tour_name}</h1>
        <div class="container-main-tour">
          <div class="left-main-tour">
            <div class="left-main-tour-slider">
              <img src="${t.image_path || 'assets/img/default-tour.jpg'}" alt="${t.tour_name}" class="left-main-tour-slide" />
            </div>
            <h2>${t.tour_name}</h2>
            <p>${t.tour_description}</p>
            <p class="price">Price Std: ${t.price_std} / VIP: ${t.price_vip}</p>
          </div>
          <div class="right-main-tour">
            <div class="main-tour-small">
              
              <h3>${t.tour_name}</h3>
              <p><b>Tour ID:</b> ${t.tour_id}</p>
              <p><b>Date:</b> ${t.tour_date}</p>
              <p><b>Time:</b> ${t.tour_time}</p>
              <img src="${t.image_path_2 || 'assets/img/default-tour.jpg'}" alt="${t.tour_name}" />
              <p>${t.tour_description}</p>
              <p><b>Location:</b> ${t.tour_location}</p>
              <p><b>Capacity:</b> ${t.capacity}</p>
              <div class="ticket-type-btns">
                <button class="btn-type" data-type="standard" data-tour-id="${t.tour_id}">Standard</button>
                <button class="btn-type" data-type="vip" data-tour-id="${t.tour_id}">VIP</button>
              </div>
              <div class="ticket-info">
                <p class="ticket-price">Select ticket type above</p>
              </div>
              <div class="checkbook">
                <button class="btn-book" data-tour-id="${t.tour_id}">Book a Ticket</button>
              </div>
            </div>
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', tourHTML);
    });

    // ====== Event ปุ่มเลือกประเภทตั๋ว ======
    const typeButtons = document.querySelectorAll('.btn-type');
    typeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const parent = button.closest('.main-tour-small');
        parent.querySelectorAll('.btn-type').forEach(b => b.classList.remove('active'));
        button.classList.add('active');

        const priceElem = parent.querySelector('.ticket-price');
        const tour = tours.find(x => x.tour_id == button.dataset.tourId);
        if (!tour) return;

        if (button.dataset.type === 'standard') {
          priceElem.textContent = `Price: ${tour.price_std}`;
        } else {
          priceElem.textContent = `Price: ${tour.price_vip}`;
        }
      });
    });

    // ====== Event ปุ่มจองตั๋ว ======
    const bookBtns = document.querySelectorAll('.btn-book');
    bookBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();

        try {
          // เช็ค login ก่อน
          const loginRes = await fetch('/me', { method: 'GET', credentials: 'include' });
          const loginData = await loginRes.json();
          if (!loginData.user) {
            showLoginModal();
            return;
          }
        } catch (err) {
          console.error("Login check error:", err);
          alert("Server error");
          return;
        }

        const tourId = parseInt(btn.dataset.tourId);
        const typeBtn = btn.closest('.main-tour-small')?.querySelector('.btn-type.active');
        if (!typeBtn) {
          alert("กรุณาเลือกประเภทตั๋วก่อนจอง");
          return;
        }

        const ticketTypeMap = {
          standard: 'std',
          vip: 'vip',
        };
        const ticketType = ticketTypeMap[typeBtn.dataset.type];
        if (!ticketType) {
          alert("ประเภทตั๋วไม่ถูกต้อง");
          return;
        }

        // 🔹 เพิ่ม confirm popup ก่อนที่จะจอง
        const confirmBooking = await openBookingConfirmModal();
        if (!confirmBooking) return; // ❌ กดยกเลิก → ไม่จอง

        // 🔹 กดตกลง → ทำการจองจริง
        try {
          const res = await fetch('/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ tour_id: tourId, ticket_type: ticketType })
          });

          if (res.ok) {
            window.location.href = "my_tickets.html";
          } else {
            const data = await res.json();
            alert(data.message || "Booking failed");
          }
        } catch (err) {
          console.error("Booking error:", err);
          alert("Server error");
        }
      });
    });


  } catch (err) {
    console.error('Error fetching tours:', err);
  }
});

// Admin - Manage Tour script
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tourForm')) {
    const tourSelector = document.getElementById('tourSelector');
    const form = document.getElementById('tourForm');
    const formTitle = document.getElementById('formTitle');
    const submitBtn = document.getElementById('submitBtn');
    const msg = document.getElementById('formMsg');

    // file input previews
    const inputImage = form.querySelector('input[name="image"]');
    const inputImage2 = form.querySelector('input[name="image_2"]');
    const preview1 = document.getElementById('preview1');
    const preview2 = document.getElementById('preview2');
    if (inputImage) {
      inputImage.addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (f && preview1) { preview1.src = URL.createObjectURL(f); preview1.style.display = 'block'; }
        else if (preview1) { preview1.src = ''; preview1.style.display = 'none'; }
      });
    }
    if (inputImage2) {
      inputImage2.addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (f && preview2) { preview2.src = URL.createObjectURL(f); preview2.style.display = 'block'; }
        else if (preview2) { preview2.src = ''; preview2.style.display = 'none'; }
      });
    }

    async function loadTours() {
      try {
        const res = await fetch('/api/all-tours', { credentials: 'include' });
        if (!res.ok) throw new Error('Cannot fetch tours from API');
        const tours = await res.json();

        // --- ส่วนที่แก้ไขปัญหาตัวเลือกซ้ำ ---
        const firstOption = tourSelector.options[0]; // เก็บตัวเลือกแรกไว้
        tourSelector.innerHTML = ''; // ล้างตัวเลือกทั้งหมด
        if (firstOption) tourSelector.appendChild(firstOption); // นำตัวเลือกแรกกลับเข้าไป

        tours.forEach(tour => {
          const option = document.createElement('option');
          option.value = tour.tour_id;
          option.textContent = `${tour.tour_name} (ID: ${tour.tour_id})`;
          tourSelector.appendChild(option);
        });
      } catch (err) {
        console.error('Error loading tours:', err);
        msg.textContent = 'Failed to load tour list. Please check server connection.';
      }
    }

    function resetFormToAddMode() {
      form.reset();
      form.tour_id.value = '';
      formTitle.textContent = 'Add New Tour';
      submitBtn.textContent = 'Add Tour';
      tourSelector.value = '';
      msg.textContent = '';
      const prev1 = document.getElementById('preview1');
      const prev2 = document.getElementById('preview2');
      if (prev1) { prev1.src = ''; prev1.style.display = 'none'; }
      if (prev2) { prev2.src = ''; prev2.style.display = 'none'; }
    }

    tourSelector.addEventListener('change', async (e) => {
      const tourId = e.target.value;
      if (!tourId) {
        resetFormToAddMode();
        return;
      }
      try {
        const res = await fetch(`/api/tours/${tourId}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Tour not found');
        const tour = await res.json();

        form.tour_id.value = tour.tour_id;
        form.tour_name.value = tour.tour_name || '';
        form.tour_status.value = tour.tour_status || 'scheduled';
        form.tour_date.value = tour.tour_date ? new Date(tour.tour_date).toISOString().split('T')[0] : '';
        form.tour_time.value = tour.tour_time || '';
        form.tour_type.value = tour.tour_type || '';
        form.tour_description.value = tour.tour_description || '';
        form.tour_location.value = tour.tour_location || '';
        form.price_std.value = tour.price_std ?? '';
        form.price_vip.value = tour.price_vip ?? '';
        form.capacity.value = tour.capacity ?? '';
        // previews
        const prev1 = document.getElementById('preview1');
        const prev2 = document.getElementById('preview2');
        if (prev1) {
          if (tour.image_path) { prev1.src = tour.image_path; prev1.style.display = 'block'; } else { prev1.src = ''; prev1.style.display = 'none'; }
        }
        if (prev2) {
          if (tour.image_path_2) { prev2.src = tour.image_path_2; prev2.style.display = 'block'; } else { prev2.src = ''; prev2.style.display = 'none'; }
        }

        formTitle.textContent = `Update Tour (ID: ${tour.tour_id})`;
        submitBtn.textContent = 'Update Tour';
        msg.textContent = '';
      } catch (err) {
        console.error('Error fetching tour details:', err);
        msg.textContent = 'Failed to load tour data.';
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tourId = form.tour_id.value;
      const isUpdate = !!tourId;

      // Use FormData so file inputs are sent
      const formData = new FormData(form);

      const url = isUpdate ? `/api/tours/${tourId}` : '/api/Insert_tours';
      const method = isUpdate ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method: method,
          body: formData,
          credentials: 'include'
        });
        const data = await res.json();

        if (res.ok) {
          alert(`Tour ${isUpdate ? 'updated' : 'added'} successfully!`);
          location.reload();
        } else {
          alert(data.message || `Failed to ${isUpdate ? 'update' : 'add'} tour.`);
        }
      } catch (err) {
        console.error(`Error ${isUpdate ? 'updating' : 'adding'} tour:`, err);
        alert('Server error.');
      }
    });

    loadTours();
  }
});

// Admin - Fetch and Display tour
document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.querySelector('#toursTable tbody');

  try {
    // เรียก API เพื่อดึงข้อมูลทัวร์ทั้งหมด
    const response = await fetch('/api/get-all-tours-data');
    if (!response.ok) {
      throw new Error('Failed to fetch tour data.');
    }
    const tours = await response.json();

    // เคลียร์ข้อมูลเก่า (ถ้ามี)
    tableBody.innerHTML = '';

    // วนลูปเพื่อสร้างแถวในตาราง
    tours.forEach(tour => {
      const row = document.createElement('tr');
      // แปลง format วันที่ให้อ่านง่าย
      const tourDate = new Date(tour.tour_date).toLocaleDateString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric'
      });

      row.innerHTML = `
                        <td>${tour.tour_id}</td>
                        <td>${tour.tour_name}</td>
                        <td>${tour.tour_status}</td>
                        <td>${tourDate}</td>
                        <td>${tour.tour_time}</td>
                        <td>${tour.tour_type}</td>
                        <td>${tour.tour_location}</td>
                        <td>${tour.price_std} / ${tour.price_vip}</td>
                        <td>${tour.capacity}</td>
                    `;
      tableBody.appendChild(row);
    });

  } catch (error) {
    console.error('Error fetching tours:', error);
    tableBody.innerHTML = '<tr><td colspan="9">Error loading data. Please try again later.</td></tr>';
  }
});

// Admin - Manage Ticket script
document.addEventListener("DOMContentLoaded", function () {
  // LIST OF STATUS VALUES that will appear in dropdown.
  // IMPORTANT: make these values match exactly the enum values in your DB.
  const STATUS_VALUES = ['pending', 'confirmed', 'canceled', 'used', 'expired'];

  // DOM
  const ticketsTbody = document.querySelector('#ticketsTable tbody');
  const ticketMsg = document.getElementById('ticketMsg');
  const filterStatus = document.getElementById('filterStatus');
  const reloadBtn = document.getElementById('reloadBtn');

  if (!ticketsTbody) return; // safety if script loaded on other pages

  // helper: format date
  function fmtDate(d) {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleString();
    } catch (e) {
      return d;
    }
  }

  // helper: show message
  function showMsg(text, type = '') {
    ticketMsg.textContent = text || '';
    ticketMsg.className = 'msg' + (type ? (' ' + type) : '');
  }

  // fetch + render
  let ticketsCache = [];

  async function loadTickets() {
    showMsg('Loading tickets...');
    ticketsTbody.innerHTML = '';
    try {
      const res = await fetch('/gettickets', { credentials: 'include' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(body.message || `Status ${res.status}`);
      }
      const data = await res.json();
      // ensure data is array
      if (!Array.isArray(data)) throw new Error('Invalid tickets data');

      ticketsCache = data.slice();

      // client-side sort: pending first, then others, newest id first within group
      const order = { pending: 1, confirmed: 2, canceled: 3, used: 4, expired: 5 };
      ticketsCache.sort((a, b) => {
        const oa = order[a.ticket_status] || 99;
        const ob = order[b.ticket_status] || 99;
        if (oa !== ob) return oa - ob;
        return (b.ticket_id || 0) - (a.ticket_id || 0);
      });

      renderTickets(ticketsCache);
      showMsg('');
    } catch (err) {
      console.error('Load tickets error:', err);
      showMsg(err.message || 'Failed to load tickets', 'error');
    }
  }

  function renderTickets(list) {
    ticketsTbody.innerHTML = '';
    if (!list.length) {
      ticketsTbody.innerHTML = '<tr><td colspan="8" style="padding:18px;text-align:center;color:#666">No tickets found.</td></tr>';
      return;
    }

    list.forEach(ticket => {
      const tr = document.createElement('tr');

      // create status select
      const select = document.createElement('select');
      select.className = 'status-select';
      let allowedOptions = STATUS_VALUES;
      if (ticket.ticket_status === 'pending') {
        allowedOptions = ['pending', 'canceled', 'confirmed', 'expired'];
      } else if (ticket.ticket_status === 'confirmed') {
        allowedOptions = ['confirmed', 'used'];
      } else {
        allowedOptions = [];
      }

      // ถ้า allowedOptions ว่าง ให้ disable select และแสดง option ปัจจุบันอย่างเดียว
      if (allowedOptions.length === 0) {
        select.disabled = true;
        const opt = document.createElement('option');
        opt.value = ticket.ticket_status;
        opt.textContent = ticket.ticket_status.charAt(0).toUpperCase() + ticket.ticket_status.slice(1);
        opt.selected = true;
        select.appendChild(opt);
      } else {
        allowedOptions.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s;
          opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
          if (ticket.ticket_status === s) opt.selected = true;
          select.appendChild(opt);
        });
      }

      // create save button
      const btn = document.createElement('button');
      if (ticket.ticket_status === 'canceled' || ticket.ticket_status === 'used' || ticket.ticket_status === 'expired') {
        btn.disabled = 'true';
        btn.className = 'save-btn';
      } else {
        btn.className = 'save-btn';
        btn.textContent = 'Save';
      }

      // assemble row
      tr.innerHTML = `
        <td>${ticket.ticket_id}</td>
        <td>${escapeHtml(ticket.user_id)}</td>
        <td>${escapeHtml(ticket.username)}</td>
        <td>${escapeHtml(ticket.tour_name)}</td>
        <td>${escapeHtml(ticket.ticket_type)}</td>
      `;
      const purchaseTd = `<td>${fmtDate(ticket.purchase_date)}</td>`;
      const expiryTd = `<td>${fmtDate(ticket.expiry_date)}</td>`;

      // append td for status + purchase/expiry/action
      const statusTd = document.createElement('td');
      statusTd.appendChild(select);

      const purchaseCell = document.createElement('td');
      purchaseCell.innerHTML = fmtDate(ticket.purchase_date);

      const expiryCell = document.createElement('td');
      expiryCell.innerHTML = fmtDate(ticket.expiry_date);

      const actionTd = document.createElement('td');
      actionTd.appendChild(btn);

      // put into tr
      tr.appendChild(statusTd);
      tr.appendChild(purchaseCell);
      tr.appendChild(expiryCell);
      tr.appendChild(actionTd);

      // event: save click
      btn.addEventListener('click', async () => {
        // disable while updating
        btn.disabled = true;
        btn.textContent = 'Saving...';
        showMsg('');

        const newStatus = select.value;

        // quick client-side validation: ensure allowed value
        if (!STATUS_VALUES.includes(newStatus)) {
          showMsg('Invalid status selected', 'error');
          btn.disabled = false;
          btn.textContent = 'Save';
          return;
        }

        try {
          const res = await fetch(`/updateticket/${ticket.ticket_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ ticket_status: newStatus })
          });

          const body = await res.json().catch(() => ({ message: 'Invalid response' }));

          if (!res.ok) throw new Error(body.message || `Status ${res.status}`);

          // update cache and UI row
          ticket.ticket_status = newStatus;
          showMsg(`Ticket #${ticket.ticket_id} updated.`, 'success');

          // reload or reorder: simplest — reload full list to keep ordering consistent
          await loadTickets();
        } catch (err) {
          console.error('Update error:', err);
          showMsg(err.message || 'Update failed', 'error');
          btn.disabled = false;
          btn.textContent = 'Save';
        }
      });

      ticketsTbody.appendChild(tr);
    });
  }

  // simple escape to avoid injecting HTML from DB values
  function escapeHtml(str) {
    if (str == null) return '-';
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  // filters
  function applyFilters() {
    const status = filterStatus.value;
    let list = ticketsCache.slice();
    if (status) list = list.filter(t => t.ticket_status === status);
    renderTickets(list);
  }

  // events
  filterStatus?.addEventListener('change', applyFilters);
  reloadBtn?.addEventListener('click', loadTickets);

  // initial
  loadTickets();

});

// User Ticket Script
document.addEventListener('DOMContentLoaded', function () {
  const ticketContainer = document.getElementById('ticket-container-my_tickets');
  const statusMessage = document.getElementById('status-message-my_tickets');
  // Function to format date string into a more readable format (Thai)
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Bangkok' };
    return new Date(dateString).toLocaleDateString('en-EN', options);
  }

  // Function to display tickets on the page
  function displayTickets(tickets) {
    // Clear previous content
    ticketContainer.innerHTML = '';
    statusMessage.textContent = '';

    if (!tickets || tickets.length === 0) {
      statusMessage.textContent = 'ไม่พบตั๋วของคุณ';
      return;
    }

    const ticketCardsHTML = tickets.map(ticket => {
      // Use ticket_status to apply the correct CSS class
      const statusClass = `status-${ticket.ticket_status.toLowerCase()}`;

      let displayTicketType = ticket.ticket_type; // ค่าเริ่มต้น
      if (ticket.ticket_type.toLowerCase() === 'std') {
        displayTicketType = 'Standard';
      } else if (ticket.ticket_type.toLowerCase() === 'vip') {
        displayTicketType = 'VIP';
      }
      return `
                <div class="ticket-card">
                    <div class="card-header">
                        <h2>${ticket.tour_name}</h2>
                        <span class="ticket-status ${statusClass}">${ticket.ticket_status}</span>
                    </div>
                    <div class="card-body">
                        <p><strong> Location:</strong> ${ticket.tour_location}</p>
                        <p><strong> Tour Date:</strong> ${formatDate(ticket.tour_date)}</p>
                        <p><strong> Time:</strong> ${ticket.tour_time}</p>
                        <p><strong> Tour Type:</strong> ${displayTicketType}</p>
                        <p><strong> Expiry Date:</strong> ${formatDate(ticket.expiry_date)}</p>
                    </div>
                    <div class="card-footer">
                        <p>ID: #${ticket.ticket_id}</p>
                        <p>Purchase Date: ${formatDate(ticket.purchase_date)}</p>
                    </div>
                </div>
            `;
    })
    .join(''); // join เพื่อรวม string หลายๆ อันเป็นอันเดียว 

    ticketContainer.innerHTML = ticketCardsHTML;
  }

  // Main function to fetch tickets from the API
  async function fetchTickets() {
    statusMessage.textContent = 'กำลังโหลดข้อมูลตั๋ว...';
    try {
      const response = await fetch('/my_tickets');

      if (response.status === 401) {
        // Not authenticated
        statusMessage.innerHTML = 'กรุณา <a href="#" id="openLoginLink">เข้าสู่ระบบ</a> เพื่อดูตั๋วของคุณ';
        ticketContainer.innerHTML = ''; // Clear any existing tickets

        // add click event ให้ลิงก์เปิด modal login
        document.addEventListener('click', function handleLoginClick(e) {
          if (e.target && e.target.id === 'openLoginLink') {
            e.preventDefault();
            showLoginModal(); // show modal login function
            document.removeEventListener('click', handleLoginClick); // ลบ event หลังเรียกครั้งเดียว
          }
        });

        return;
      }

      if (!response.ok) {
        throw new Error(`เกิดข้อผิดพลาดจากเซิร์ฟเวอร์: ${response.statusText}`);
      }

      const tickets = await response.json();
      displayTickets(tickets);

    } catch (error) {
      console.error("Fetch tickets error:", error);
      statusMessage.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อ ไม่สามารถโหลดข้อมูลตั๋วได้';
      ticketContainer.innerHTML = '';
    }
  }

  // Initial call to fetch tickets when the page loads
  fetchTickets();
});

// Ensure date inputs cannot select past dates
document.addEventListener('DOMContentLoaded', function () {
  function setMinDateOnInputs() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const minDate = `${yyyy}-${mm}-${dd}`;

    // target inputs: name="tour_date" and any input.date with class 'min-today'
    const inputs = Array.from(document.querySelectorAll('input[type="date"][name="tour_date"], input[type="date"].min-today'));
    inputs.forEach(inp => {
      try {
        inp.setAttribute('min', minDate);
        // if current value is before min, overwrite with min
        if (inp.value && inp.value < minDate) inp.value = minDate;
      } catch (e) {
        // ignore
      }
    });
  }

  // run immediately and also after short delay (in case inputs are added dynamically)
  setMinDateOnInputs();
  setTimeout(setMinDateOnInputs, 500);
});