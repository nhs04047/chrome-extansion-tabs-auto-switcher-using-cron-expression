var cronValidator = require("cron-validator");
import "../css/popup.css";

document.addEventListener("DOMContentLoaded", function () {
  var cronExpressionHelp = document.getElementById("cronExpressionHelp");
  var saveButton = document.getElementById("saveButton");
  var cronExpressionInput = document.getElementById("cronExpression");
  var startButton = document.getElementById("startButton");
  var stopButton = document.getElementById("stopButton");
  var statusCircle = document.getElementById("statusCircle");

  chrome.storage.session.get(["cronExpression"], function (result) {
    var storedCronExpression = result.cronExpression;
    if (storedCronExpression) {
      cronExpressionInput.value = storedCronExpression;
    }
  });

  chrome.storage.session.get(["switchingAbled"], async function (result) {
    var switchingAbled = result.switchingAbled;
    if (switchingAbled === true) {
      statusCircle.style.backgroundColor = "green";
    }
  });

  cronExpressionInput.addEventListener("input", function () {
    var cronExpression = cronExpressionInput.value;
    if (isValidCronExpression(cronExpression)) {
      cronExpressionHelp.textContent = "";
    } else if (cronExpression.length === 0) {
      cronExpression.textContent = "Enter Cron expression";
    } else {
      cronExpressionHelp.textContent = "Please enter a valid Cron expression.";
      cronExpression.style.color = "red";
    }
  });

  saveButton.addEventListener("click", async function () {
    await jobOff();
    var cronExpression = cronExpressionInput.value;
    if (!isValidCronExpression(cronExpression)) {
      return;
    }
    chrome.storage.session.set({ cronExpression: cronExpression }, function () {
      alert("Cron expression saved!");
    });
  });

  startButton.addEventListener("click", async () => {
    await jobOn();
  });

  stopButton.addEventListener("click", async () => {
    await jobOff();
  });

  function isValidCronExpression(cronExpression) {
    return cronValidator.isValidCron(cronExpression, {
      seconds: true,
      alias: true,
      allowBlankDay: true,
      allowSevenAsSunday: true,
    });
  }

  async function jobOff() {
    await chrome.runtime.sendMessage({ command: "off" });
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.log(err.message);
      });
    }

    statusCircle.style.backgroundColor = "red";
    await chrome.storage.session.set({ switchingAbled: false });
  }

  async function jobOn() {
    const result = await chrome.storage.session.get(["cronExpression"]);
    if (
      !result.cronExpression ||
      !isValidCronExpression(result.cronExpression)
    ) {
      await jobOff();
      return;
    }
    await chrome.runtime.sendMessage({
      command: "on",
      cronExpression: result.cronExpression,
    });
    document.documentElement.requestFullscreen().catch((err) => {
      console.log(err.message);
    });
    statusCircle.style.backgroundColor = "green";
    await chrome.storage.session.set({ switchingAbled: true });
  }
});
