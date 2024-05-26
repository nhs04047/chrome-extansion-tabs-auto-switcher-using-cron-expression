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
  var nextNumberHelp = document.getElementById("nextNumberHelp");
  var startButton = document.getElementById("startButton");
  var stopButton = document.getElementById("stopButton");
  var statusCircle = document.getElementById("statusCircle");

  chrome.storage.session.get(
    ["cronExpression", "tabReloadStatus", "nextNumber", "driveStatus"],
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

      statusCircle.style.backgroundColor =
        result.driveStatus === true ? "green" : "red";
    }
  );

  cronExpressionInput.addEventListener("input", async () => {
    var cronExpression = cronExpressionInput.value;
    if (isValidCronExpression(cronExpression)) {
      cronExpressionHelp.textContent = "";
      await chrome.storage.session.set({
        cronExpression: cronExpressionInput.value,
      });
    } else if (cronExpression.length === 0) {
      cronExpressionHelp.textContent = "Enter Cron expression";
    } else {
      cronExpressionHelp.textContent = "Please enter a valid Cron expression.";
      cronExpressionHelp.style.color = "red";
    }
  });

  tabReloadOptionCheckbox.addEventListener("click", async () => {
    if (tabReloadOptionCheckbox.checked) {
      await chrome.storage.session.set({ tabReloadStatus: true });
      nextNumberHelp.style.display = "block";
      nextNumberHelp.style.color = "red";
    } else {
      await chrome.storage.session.set({ tabReloadStatus: false });
      nextNumberHelp.style.display = "none";
    }
  });

  nextNumberInput.addEventListener("input", async () => {
    var nextNumber = Number(nextNumberInput.value);
    if (isNaN(nextNumber) || nextNumberInput.value.length === 0) {
      nextNumberHelp.style.display = "block";
      nextNumberHelp.style.color = "red";
    } else {
      nextNumberHelp.style.display = "none";
      await chrome.storage.session.set({ nextNumber: nextNumber });
    }
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
    await chrome.storage.session.set({ driveStatus: false });
  }

  async function jobOn() {
    const result = await chrome.storage.session.get([
      "cronExpression",
      "nextNumber",
      "tabReloadStatus",
    ]);
    if (
      !result.cronExpression ||
      !isValidCronExpression(result.cronExpression)
    ) {
      await jobOff();
      return;
    }

    if (result.tabReloadStatus && isNaN(Number(result.nextNumber))) {
      await chrome.storage.session.set({ tabReloadStatus: false });
    }

    await chrome.runtime.sendMessage({
      command: "on",
      cronExpression: result.cronExpression,
      nextNumber:
        result.nextNumber === undefined ? 1 : Number(result.nextNumber),
      tabReloadStatus:
        result.tabReloadStatus === undefined ? false : result.tabReloadStatus,
    });
    document.documentElement.requestFullscreen().catch((err) => {
      console.log(err.message);
    });
    statusCircle.style.backgroundColor = "green";
    await chrome.storage.session.set({ driveStatus: true });
  }
});
