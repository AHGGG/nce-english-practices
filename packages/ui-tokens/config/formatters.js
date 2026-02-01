const StyleDictionary = require("style-dictionary");

StyleDictionary.registerFormat({
  name: "tailwind/colors",
  format: function ({ dictionary, options, file }) {
    let output = "";

    output += "module.exports = {\n";

    dictionary.allProperties.forEach((prop) => {
      if (prop.type === "color") {
        const path = prop.path.join("-");
        output += `  "${path}": "${prop.value}",\n`;
      }
    });

    output += "};\n";
    return output;
  },
});

StyleDictionary.registerFormat({
  name: "css/variables-with-comments",
  format: function ({ dictionary, options, file }) {
    const { outputReferences } = options;
    let output = ":root {\n";

    dictionary.allProperties.forEach((prop) => {
      const value =
        outputReferences && prop.xref ? `var(--${prop.xref.name})` : prop.value;

      const comment = prop.description ? `  /* ${prop.description} */\n` : "";

      output += `${comment}  --${prop.name}: ${value};\n`;
    });

    output += "}\n";
    return output;
  },
});

module.exports = { StyleDictionary };
