import "./index.css"

// A generic debounce function to ensure we don't spam the server with requests
// while the user is typing.
function debounce(callback, wait) {
  let timeout = null;

  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback(...args), wait);
  };
}

import("./monacoLoader")
  .then(async ({ default: loader }) => {
    const monaco = await loader.init();
    const editor = document.getElementById("input");

    const newEditor = document.createElement("div");
    editor.replaceWith(newEditor);

    return monaco.editor.create(newEditor, {
      value: editor.value,
      language: "ruby",
      minimap: {
        enabled: false
      }
    });
  })
  .then((editor) => {
    const output = document.getElementById("output");

    // We're going to handle updates to the source through a custom event. This
    // turns out to be faster than handling the change event directly on the
    // editor since it blocks updates to the UI until the event handled returns.
    output.addEventListener("code-change", debounce((event) => {
      fetch(process.env.SERVER_URL, { method: "POST", body: JSON.stringify(event.detail) })
        .then((response) => response.json())
        .then((data) => {
          for (const [id, value] of Object.entries(data)) {
            output.querySelector(`[data-id="${id}"]`).querySelector("pre").textContent = value;
          }
        });
    }, 500));

    // This function is responsible for dispatching a custom event that we will
    // handle for whenever the editor changes or something in the form changes.
    function dispatchCodeChange() {
      output.dispatchEvent(new CustomEvent("code-change", {
        detail: {
          code: editor.getValue(),
          types: Object.keys(Object.fromEntries(new FormData(output).entries()))
        }
      }));
    }

    // Attach event listeners to fire off requests whenever the code or an
    // element within the form changes.
    editor.onDidChangeModelContent(dispatchCodeChange);
    output.addEventListener("change", dispatchCodeChange);

    // Also attach event listeners to reorder the form elements whenever the
    // user activates one.
    const orderable = Array.from(output.querySelectorAll("[data-order]"));

    output.addEventListener("change", () => {
      const nextOrderable = [...orderable].sort((left, right) => {
        if (left.querySelector("input:checked") && !right.querySelector("input:checked")) {
          return -1;
        }

        if (!left.querySelector("input:checked") && right.querySelector("input:checked")) {
          return 1;
        }

        return parseInt(left.dataset["order"], 10) - parseInt(right.dataset["order"], 10);
      });

      for (const element of nextOrderable) {
        element.style.order = nextOrderable.indexOf(element);
      }
    });
  });
