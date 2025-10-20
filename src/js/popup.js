var cronValidator = require("cron-validator");
import "../css/popup.css";
import "../img/saved-mark.svg";

document.addEventListener("DOMContentLoaded", function () {
  var cronExpressionHelp = document.getElementById("cronExpressionHelp");
  var cronExpressionInput = document.getElementById("cronExpression");
  var tabReloadOptionCheckbox = document.getElementById(
    "tabReloadOptionCheckbox"
  );
  var nextNumberInput = document.getElementById("nextNumberInput");
  var ifOneTabWindowReloadOptionCheckbox = document.getElementById(
    "ifOneTabWindowReloadOptionCheckbox"
  );
  var nextNumberHelp = document.getElementById("nextNumberHelp");
  var startButton = document.getElementById("startButton");
  var stopButton = document.getElementById("stopButton");
  var statusCircle = document.getElementById("statusCircle");
  var statusText = document.getElementById("statusText");

  chrome.storage.session.get(
    [
      "cronExpression",
      "tabReloadStatus",
      "ifOneTabWindowReload",
      "nextNumber",
      "driveStatus",
    ],
    async (result) => {
      console.log(result);
      if (result.cronExpression) {
        cronExpressionInput.value = result.cronExpression;
      }
      if (result.nextNumber) {
        nextNumberInput.value = result.nextNumber ?? 1;
      }

      tabReloadOptionCheckbox.checked =
        result.tabReloadStatus === true ? true : false;

      ifOneTabWindowReloadOptionCheckbox.checked =
        result.ifOneTabWindowReload === true ? true : false;

      updateStatus(result.driveStatus === true);
    }
  );

  cronExpressionInput.addEventListener("input", async () => {
    var cronExpression = cronExpressionInput.value;
    if (isValidCronExpression(cronExpression)) {
      cronExpressionHelp.textContent = "✓ Valid cron expression";
      cronExpressionHelp.className = "help-text success";
      cronExpressionInput.classList.add("success");
      await chrome.storage.session.set({
        cronExpression: cronExpressionInput.value,
      });
    } else if (cronExpression.length === 0) {
      cronExpressionHelp.textContent =
        "Enter a valid cron expression to schedule tab switching";
      cronExpressionHelp.className = "help-text";
      cronExpressionInput.classList.remove("success");
    } else {
      cronExpressionHelp.textContent = "Please enter a valid Cron expression.";
      cronExpressionHelp.className = "help-text error";
      cronExpressionInput.classList.remove("success");
    }
  });

  tabReloadOptionCheckbox.addEventListener("click", async () => {
    if (tabReloadOptionCheckbox.checked) {
      await chrome.storage.session.set({ tabReloadStatus: true });
      nextNumberHelp.style.display = "block";
      nextNumberHelp.className = "help-text error";
    } else {
      await chrome.storage.session.set({ tabReloadStatus: false });
      nextNumberHelp.style.display = "none";
    }
  });

  nextNumberInput.addEventListener("input", async () => {
    var nextNumber = Number(nextNumberInput.value);
    if (isNaN(nextNumber) || nextNumberInput.value.length === 0) {
      nextNumberHelp.style.display = "block";
      nextNumberHelp.className = "help-text error";
    } else {
      nextNumberHelp.style.display = "none";
      await chrome.storage.session.set({ nextNumber: nextNumber });
    }
  });

  ifOneTabWindowReloadOptionCheckbox.addEventListener("click", async () => {
    if (ifOneTabWindowReloadOptionCheckbox.checked) {
      await chrome.storage.session.set({ ifOneTabWindowReload: true });
    } else {
      await chrome.storage.session.set({ ifOneTabWindowReload: false });
    }
  });

  startButton.addEventListener("click", async () => {
    console.log("Start button clicked");
    setButtonLoading(startButton, true);
    try {
      await jobOn();
      console.log("Job started successfully");
    } catch (error) {
      console.error("Error starting job:", error);
    } finally {
      setButtonLoading(startButton, false);
    }
  });

  stopButton.addEventListener("click", async () => {
    setButtonLoading(stopButton, true);
    await jobOff();
    setButtonLoading(stopButton, false);
  });

  function isValidCronExpression(cronExpression) {
    // Try 6-field format first (with seconds)
    const sixFieldValid = cronValidator.isValidCron(cronExpression, {
      seconds: true,
      alias: true,
      allowBlankDay: true,
      allowSevenAsSunday: true,
    });

    // If 6-field format fails, try 5-field format (without seconds)
    if (!sixFieldValid) {
      return cronValidator.isValidCron(cronExpression, {
        seconds: false,
        alias: true,
        allowBlankDay: true,
        allowSevenAsSunday: true,
      });
    }

    return sixFieldValid;
  }

  async function jobOff() {
    await chrome.runtime.sendMessage({ command: "off" });
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.log(err.message);
      });
    }

    updateStatus(false);
    await chrome.storage.session.set({ driveStatus: false });
  }

  async function jobOn() {
    console.log("jobOn function called");
    const result = await chrome.storage.session.get([
      "cronExpression",
      "nextNumber",
      "tabReloadStatus",
      "ifOneTabWindowReload",
    ]);

    console.log("Storage result:", result);

    // Check if cron expression is missing or invalid
    if (
      !result.cronExpression ||
      !isValidCronExpression(result.cronExpression)
    ) {
      console.log("Invalid or missing cron expression");
      showCronExpressionError();
      await jobOff();
      return;
    }

    if (result.tabReloadStatus && isNaN(Number(result.nextNumber))) {
      await chrome.storage.session.set({ tabReloadStatus: false });
    }

    console.log("Sending message to background script");
    await chrome.runtime.sendMessage({
      command: "on",
      cronExpression: result.cronExpression,
      nextNumber:
        result.nextNumber === undefined ? 1 : Number(result.nextNumber),
      tabReloadStatus:
        result.tabReloadStatus === undefined ? false : result.tabReloadStatus,
      ifOneTabWindowReload:
        result.ifOneTabWindowReload === undefined
          ? false
          : result.ifOneTabWindowReload,
    });
    console.log("Message sent successfully");
    document.documentElement.requestFullscreen().catch((err) => {
      console.log(err.message);
    });
    updateStatus(true);
    await chrome.storage.session.set({ driveStatus: true });
  }

  function updateStatus(isActive) {
    if (isActive) {
      statusCircle.classList.add("active");
      statusText.textContent = "Running";
    } else {
      statusCircle.classList.remove("active");
      statusText.textContent = "Stopped";
    }
  }

  function setButtonLoading(button, isLoading) {
    if (isLoading) {
      button.classList.add("loading");
      button.disabled = true;
    } else {
      button.classList.remove("loading");
      button.disabled = false;
    }
  }

  function showCronExpressionError() {
    // Focus on the cron expression input
    cronExpressionInput.focus();

    // Add error styling
    cronExpressionInput.classList.add("error");

    // Show error message
    cronExpressionHelp.textContent =
      "⚠️ Please enter a valid cron expression to start the scheduler";
    cronExpressionHelp.className = "help-text error";

    // Remove error styling after 3 seconds
    setTimeout(() => {
      cronExpressionInput.classList.remove("error");
    }, 3000);
  }
});
