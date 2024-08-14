// content.js

console.log("Content script is running.");

function handleAutologinClick(event) {
  if (event.target.classList.contains("autologin")) {
    console.log("Autologin button clicked.");

    const rowId = event.target.textContent.trim();
    console.log('Button with class "autologin" clicked, row ID:', rowId);
  }
}
function checkForAutologinButtons() {
  const autologinButtons = document.querySelectorAll(".autologin");
  if (autologinButtons.length > 0) {
    document.addEventListener("click", handleAutologinClick);
  }
}

const observer = new MutationObserver(function (mutationsList) {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      checkForAutologinButtons();
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

checkForAutologinButtons();
