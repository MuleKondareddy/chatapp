document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");
  const chatForm = document.getElementById("chat-form");
  const registerButton = document.getElementById("register-button");
  const loginButton = document.getElementById("login-button");
  const regUsernameInput = document.getElementById("reg-username-input");
  const regEmailInput = document.getElementById("reg-email-input");
  const regPasswordInput = document.getElementById("reg-password-input");
  const loginEmailInput = document.getElementById("login-email-input");
  const loginPasswordInput = document.getElementById("login-password-input");
  const showLogin = document.getElementById("show-login");
  const showRegister = document.getElementById("show-register");
  const nameInput = document.getElementById("name-input");
  const messageContainer = document.getElementById("message-container");
  const messageForm = document.getElementById("message-form");
  const messageInput = document.getElementById("message-input");
  const clientsTotal = document.getElementById("client-total");

  // Show login form and hide register form
  showLogin.addEventListener("click", () => {
    registerForm.style.display = "none";
    loginForm.style.display = "block";
  });

  // Show register form and hide login form
  showRegister.addEventListener("click", () => {
    loginForm.style.display = "none";
    registerForm.style.display = "block";
  });

  // Register user
  registerButton.addEventListener("click", async () => {
    const username = regUsernameInput.value;
    const email = regEmailInput.value;
    const password = regPasswordInput.value;
    const response = await fetch("/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await response.json();
    alert(data.message);
    if (response.ok) {
      registerForm.style.display = "none";
      loginForm.style.display = "block";
    }
  });

  // Login user
  loginButton.addEventListener("click", async () => {
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;
    const response = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (data.token) {
      localStorage.setItem("token", data.token);
      nameInput.innerHTML = data.username; // Set username in the chat form
      nameInput.value = data.username;
      loginForm.style.display = "none";
      chatForm.style.display = "block";
      initChat();
    } else {
      alert(data.message);
    }
  });

  // Initialize chat functionality
  function initChat() {
    const socket = io({
      query: {
        token: localStorage.getItem("token"),
      },
    });

    messageForm.addEventListener("submit", (e) => {
      e.preventDefault();
      sendMessage();
    });

    socket.on("clients-total", (data) => {
      clientsTotal.innerText = `Total clients: ${data}`;
    });

    socket.on("chat-message", (data) => {
      addMessageToUI(false, data);
    });

    socket.on("feedback", (data) => {
      clearFeedback();
      const element = `<li class="message-feedback">
        <p class="feedback">${data.feedback}</p>
      </li>`;
      messageContainer.innerHTML += element;
    });

    messageInput.addEventListener("keypress", () => {
      socket.emit("feedback", {
        feedback: `${nameInput.value} is typing a message`,
      });
    });

    messageInput.addEventListener("blur", () => {
      socket.emit("feedback", {
        feedback: "",
      });
    });

    function sendMessage() {
      const message = messageInput.value.trim();
      if (message === "") return;
      socket.emit("message", { message, name: nameInput.value });
      addMessageToUI(true, { message, name: nameInput.value });
      messageInput.value = "";
    }

    function addMessageToUI(isOwnMessage, data) {
      clearFeedback();
      const li = document.createElement("li");
      li.classList.add(isOwnMessage ? "message-right" : "message-left");
      li.innerHTML = `
        <p class="message">${data.message}<span>${
        data.name
      } ● ${moment().format("LT")}</span></p>
      `;
      messageContainer.appendChild(li);
      scrollToBottom();
    }

    function clearFeedback() {
      messageContainer
        .querySelectorAll(".message-feedback")
        .forEach((element) => element.remove());
    }

    function scrollToBottom() {
      messageContainer.scrollTop = messageContainer.scrollHeight;
    }
  }
});
