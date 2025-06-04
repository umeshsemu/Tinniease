import LLMService from './llmService.js';

class TinnieaseApp {
  constructor() {
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    this.oscillator = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.userData = {
      isNewUser: null,
      name: "",
      dateOfBirth: "",
      phoneNumber: "",
      tinnitusType: null,
      affectedEar: null,
    };
    this.llmService = new LLMService();

    this.createInitialUI();
    this.startConversation();
  }

  createInitialUI() {
    const mainContent = document.getElementById("main-content");

    // Create chat container
    const chatContainer = document.createElement("div");
    chatContainer.className = "chat-container";

    // Create chat messages area
    const chatMessages = document.createElement("div");
    chatMessages.id = "chat-messages";
    chatMessages.className = "chat-messages";

    // Create chat input area
    const chatInput = document.createElement("div");
    chatInput.className = "chat-input";

    const userInput = document.createElement("input");
    userInput.type = "text";
    userInput.id = "user-input";
    userInput.placeholder = "Type your message...";

    const sendButton = document.createElement("button");
    sendButton.id = "send-button";
    sendButton.textContent = "Send";

    chatInput.appendChild(userInput);
    chatInput.appendChild(sendButton);

    chatContainer.appendChild(chatMessages);
    chatContainer.appendChild(chatInput);

    mainContent.appendChild(chatContainer);

    this.initializeEventListeners();
  }

  createAudioControls() {
    const mainContent = document.getElementById("main-content");

    // Create audio controls container
    const audioControls = document.createElement("div");
    audioControls.id = "audio-controls";
    audioControls.className = "audio-controls";

    // Create title
    const title = document.createElement("h2");
    title.textContent = "Audio Therapy Controls";
    audioControls.appendChild(title);

    // Create frequency control
    const frequencyGroup = this.createControlGroup(
      "frequency",
      "Frequency (Hz):",
      "range",
      {
        min: "20",
        max: "20000",
        value: "1000",
      }
    );
    const frequencyValue = document.createElement("span");
    frequencyValue.id = "frequency-value";
    frequencyValue.textContent = "1000 Hz";
    frequencyGroup.appendChild(frequencyValue);

    // Create wave type control
    const waveTypeGroup = this.createControlGroup(
      "wave-type",
      "Wave Type:",
      "select",
      {
        options: [
          { value: "sine", text: "Sine" },
          { value: "square", text: "Square" },
          { value: "sawtooth", text: "Sawtooth" },
          { value: "triangle", text: "Triangle" },
        ],
      }
    );

    // Create phase control
    const phaseGroup = this.createControlGroup(
      "phase",
      "Phase (degrees):",
      "range",
      {
        min: "0",
        max: "360",
        value: "0",
      }
    );
    const phaseValue = document.createElement("span");
    phaseValue.id = "phase-value";
    phaseValue.textContent = "0°";
    phaseGroup.appendChild(phaseValue);

    // Create play/stop buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";

    const playButton = document.createElement("button");
    playButton.id = "play-button";
    playButton.textContent = "Play";

    const stopButton = document.createElement("button");
    stopButton.id = "stop-button";
    stopButton.textContent = "Stop";

    buttonContainer.appendChild(playButton);
    buttonContainer.appendChild(stopButton);

    // Append all controls
    audioControls.appendChild(frequencyGroup);
    audioControls.appendChild(waveTypeGroup);
    audioControls.appendChild(phaseGroup);
    audioControls.appendChild(buttonContainer);

    mainContent.appendChild(audioControls);

    this.initializeAudioEventListeners();
  }

  createControlGroup(id, labelText, inputType, options) {
    const group = document.createElement("div");
    group.className = "control-group";

    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = labelText;

    let input;
    if (inputType === "select") {
      input = document.createElement("select");
      input.id = id;
      options.options.forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.text;
        input.appendChild(option);
      });
    } else {
      input = document.createElement("input");
      input.type = inputType;
      input.id = id;
      Object.entries(options).forEach(([key, value]) => {
        input.setAttribute(key, value);
      });
    }

    group.appendChild(label);
    group.appendChild(input);

    return group;
  }

  initializeEventListeners() {
    const sendButton = document.getElementById("send-button");
    const userInput = document.getElementById("user-input");

    sendButton.addEventListener("click", () => this.handleUserInput());
    userInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.handleUserInput();
    });
  }

  initializeAudioEventListeners() {
    const playButton = document.getElementById("play-button");
    const stopButton = document.getElementById("stop-button");
    const frequencyInput = document.getElementById("frequency");
    const phaseInput = document.getElementById("phase");

    playButton.addEventListener("click", () => this.playAudio());
    stopButton.addEventListener("click", () => this.stopAudio());

    frequencyInput.addEventListener("input", (e) => {
      document.getElementById(
        "frequency-value"
      ).textContent = `${e.target.value} Hz`;
      if (this.oscillator) {
        this.oscillator.frequency.value = e.target.value;
      }
    });

    phaseInput.addEventListener("input", (e) => {
      document.getElementById("phase-value").textContent = `${e.target.value}°`;
      if (this.oscillator) {
        this.oscillator.phase = e.target.value * (Math.PI / 180);
      }
    });
  }

  async startConversation() {
    const initialMessage = "Hello! I'm here to help you with your tinnitus. Could you tell me about your experience with tinnitus?";
    this.addBotMessage(initialMessage);
  }

  async handleUserInput() {
    const userInput = document.getElementById("user-input");
    const message = userInput.value.trim();

    if (!message) return;

    this.addUserMessage(message);
    userInput.value = "";

    // Get response from LLM
    const response = await this.llmService.generateResponse(message);
    this.addBotMessage(response);

    // Check if we have enough information to determine tinnitus type
    const tinnitusType = this.llmService.analyzeTinnitusType();
    if (tinnitusType !== null && !this.userData.tinnitusType) {
      this.userData.tinnitusType = tinnitusType;
      
      if (tinnitusType === 3) {
        // For unilateral, we need to determine which ear
        const earResponse = await this.llmService.generateResponse(
          "Which ear is affected by your tinnitus? Please specify left or right."
        );
        this.addBotMessage(earResponse);
      } else {
        this.loadTinnitusInterface(tinnitusType);
      }
    }
  }

  loadTinnitusInterface(type) {
    let htmlFile;
    switch (type) {
      case 1: // Bilateral Symmetric
        htmlFile = "NewFolder0/mono.html";
        break;
      case 2: // Bilateral Asymmetric
        htmlFile = "NewFolder0/binaural.html";
        break;
      case 3: // Unilateral
        htmlFile = "NewFolder0/uni.html";
        break;
    }

    // Load the appropriate HTML file
    fetch(htmlFile)
      .then((response) => response.text())
      .then((html) => {
        const mainContent = document.getElementById("main-content");
        // Clear existing content except chat
        const chatContainer = mainContent.querySelector(".chat-container");
        mainContent.innerHTML = "";
        mainContent.appendChild(chatContainer);

        // Create a temporary container to parse the HTML
        const temp = document.createElement("div");
        temp.innerHTML = html;

        // Extract and execute scripts
        const scripts = temp.getElementsByTagName("script");
        const scriptsArray = Array.from(scripts);
        
        // Remove scripts from temp before appending content
        scriptsArray.forEach(script => script.remove());
        
        // Append the HTML content first
        while (temp.firstChild) {
          mainContent.appendChild(temp.firstChild);
        }

        // Execute each script
        scriptsArray.forEach(script => {
          const newScript = document.createElement("script");
          if (script.src) {
            newScript.src = script.src;
          } else {
            newScript.textContent = script.textContent;
          }
          document.body.appendChild(newScript);
        });

        // Initialize any necessary event listeners or functionality
        this.initializeTinnitusInterface(type);
      })
      .catch((error) => {
        console.error("Error loading tinnitus interface:", error);
        this.addBotMessage(
          "Sorry, there was an error loading the interface. Please try again."
        );
      });
  }

  initializeTinnitusInterface(type) {
    // Add any initialization code specific to each tinnitus type
    switch (type) {
      case 1:
        this.addBotMessage(
          "I've loaded the bilateral symmetric tinnitus interface. You can now use the controls to manage your symptoms."
        );
        break;
      case 2:
        this.addBotMessage(
          "I've loaded the bilateral asymmetric tinnitus interface. You can now use the controls to manage your symptoms."
        );
        break;
      case 3:
        this.addBotMessage(
          `I've loaded the unilateral tinnitus interface for your ${this.userData.affectedEar} ear. You can now use the controls to manage your symptoms.`
        );
        break;
    }
  }

  addUserMessage(message) {
    this.addMessage(message, "user");
  }

  addBotMessage(message) {
    this.addMessage(message, "bot");
  }

  addMessage(message, type) {
    const chatMessages = document.getElementById("chat-messages");
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;

    const messageContent = document.createElement("div");
    messageContent.className = "message-content";
    messageContent.textContent = message;

    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  showAudioControls() {
    if (this.userData.tinnitusType === 1) {
      this.addBotMessage(
        "I've set up the audio controls for bilateral symmetric tinnitus. You can adjust the frequency, wave type, and phase difference."
      );
    } else if (this.userData.tinnitusType === 2) {
      this.addBotMessage(
        "I've set up the audio controls for bilateral asymmetric tinnitus. You can adjust the frequency and wave type for each ear independently."
      );
    } else {
      this.addBotMessage(
        `I've set up the audio controls for unilateral tinnitus in your ${this.userData.affectedEar} ear. You can adjust the frequency, wave type, and phase.`
      );
    }
  }

  playAudio() {
    if (this.isPlaying) return;

    const frequency = parseFloat(document.getElementById("frequency").value);
    const waveType = document.getElementById("wave-type").value;
    const phase =
      parseFloat(document.getElementById("phase").value) * (Math.PI / 180);

    this.oscillator = this.audioContext.createOscillator();
    this.gainNode = this.audioContext.createGain();

    this.oscillator.type = waveType;
    this.oscillator.frequency.value = frequency;
    this.oscillator.phase = phase;

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.oscillator.start();
    this.isPlaying = true;
  }

  stopAudio() {
    if (!this.isPlaying) return;

    this.oscillator.stop();
    this.oscillator.disconnect();
    this.gainNode.disconnect();
    this.isPlaying = false;
  }
}

// Initialize the app when the page loads
window.addEventListener("load", () => {
  new TinnieaseApp();
});



