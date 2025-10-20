var { Cron } = require("croner");
let jobs = new Map();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request);
  if (request.command === "on") {
    console.log("Starting job with cron expression:", request.cronExpression);
    chrome.windows.getAll({ populate: true }, (windows) => {
      windows.forEach((window) => {
        const windowId = window.id;
        chrome.tabs.query({ windowId }, (tabs) => {
          const foundJog = jobs.get(windowId);
          if (foundJog) foundJog.stop();
          let currentIndex = 0;
          // Normalize cron expression - add seconds if it's 5-field format
          let cronExpression = request.cronExpression;
          const fields = cronExpression.trim().split(/\s+/);
          if (fields.length === 5) {
            cronExpression = "0 " + cronExpression; // Add seconds field
          }

          console.log("Normalized cron expression:", cronExpression);
          const job = Cron(cronExpression, () => {
            console.log("Cron job executed, switching tabs");
            currentIndex = (currentIndex + 1) % tabs.length;
            for (let i = 0; i < tabs.length; i++) {
              if (i === currentIndex) {
                chrome.tabs.update(tabs[i].id, { muted: false, active: true });
              } else {
                chrome.tabs.update(tabs[i].id, { muted: true });
              }
            }
            if (
              (request.tabReloadStatus && tabs.length > 1) ||
              (request.tabReloadStatus &&
                tabs.length === 1 &&
                request.ifOneTabWindowReload === true)
            ) {
              const nextIndex =
                (request.nextNumber >= tabs.length
                  ? currentIndex + tabs.length - 1
                  : currentIndex + request.nextNumber) % tabs.length;
              chrome.tabs.reload(tabs[nextIndex].id);
            }
          });

          jobs.set(windowId, job);
        });
      });
    });
  } else if (request.command === "off") {
    if (jobs.size) {
      jobs.forEach((value) => {
        value.stop();
      });
      jobs.keys().forEach((key) => {
        chrome.tabs.query({ windowId: key }, (tabs) => {
          for (let tab of tabs) {
            chrome.tabs.update(tab.id, { muted: false });
          }
        });
      });
    }

    jobs = new Map();
  }
});
