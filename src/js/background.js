var { Cron } = require("croner");
let jobs = new Map();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === "on") {
    chrome.windows.getAll({ populate: true }, (windows) => {
      windows.forEach((window) => {
        const windowId = window.id;
        chrome.tabs.query({ windowId }, (tabs) => {
          const foundJog = jobs.get(windowId);
          if (foundJog) foundJog.stop();
          let currentIndex = 0;
          const job = Cron(request.cronExpression, () => {
            currentIndex = (currentIndex + 1) % tabs.length;
            for (let i = 0; i < tabs.length; i++) {
              if (i === currentIndex) {
                chrome.tabs.update(tabs[i].id, { muted: false, active: true });
              } else {
                chrome.tabs.update(tabs[i].id, { muted: true });
              }
            }
            if (request.tabReloadStatus) {
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
