(() => {
  const labels = {
    continue: "Mission path opened in prototype mode.",
    map: "Path preview selected in prototype mode.",
    diagnose: "Diagnose shortcut selected in prototype mode.",
    lookup: "Command Lookup selected in prototype mode.",
    workbench: "Switch Workbench selected in prototype mode.",
    reports: "Saved Reports selected in prototype mode."
  };

  const toast = document.createElement("div");
  toast.className = "prototype-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  document.body.append(toast);

  let toastTimer = 0;

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 1600);
  }

  document.querySelectorAll("[data-prototype-action]").forEach((control) => {
    control.addEventListener("click", () => {
      const action = control.getAttribute("data-prototype-action");
      showToast(labels[action] || "Prototype action selected.");
    });
  });

  document.documentElement.classList.add("mission-studio-v2-ready");
})();
