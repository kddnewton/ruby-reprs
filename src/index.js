import "./index.css"

function debounce(callback, wait) {
  let timeout = null;

  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback(...args), wait);
  };
}

const headings = {
  RSR: "Ripper.sexp_raw(source)",
  RS: "Ripper.sexp(source)",
  RVA: "RubyVM::AbstractSyntaxTree.parse(source)",
  P: "Parser::CurrentRuby.parse(source)",
  RP: "RubyParser.new.parse(source)",
  ST: "SyntaxTree.parse(source)",
  Y: "YARP.parse(source).value"
};

import("./monacoLoader")
  .then(async ({ default: loader }) => {
    const monaco = await loader.init();
    const editor = document.getElementById("editor");
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
    const output = document.querySelector("#output");

    // We're going to handle updates to the source through a custom event. This
    // turns out to be faster than handling the change event directly on the
    // editor since it blocks updates to the UI until the event handled returns.
    output.addEventListener("source-changed", debounce((event) => {
      const body = JSON.stringify({
        code: event.detail.source,
        types: ["RSR", "RS", "RVA", "P", "RP", "ST", "Y"]
      });

      fetch("http://localhost:4567", { method: "POST", body })
        .then((response) => response.json())
        .then((data) => {
          output.innerHTML = "";

          for (const [key, value] of Object.entries(data)) {
            const div = document.createElement("div");
            div.innerHTML = `<h2><code>${headings[key]}</code></h2><pre>${value}</pre>`;
            output.appendChild(div);
          }
        });
    }, 500));

    // Attach to the editor and dispatch custom source-changed events whenever the
    // value is updated in the editor.
    editor.onDidChangeModelContent(() => {
      output.dispatchEvent(new CustomEvent("source-changed", {
        detail: { source: editor.getValue() }
      }));
    });
  });
