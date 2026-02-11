import StyleDictionary from "style-dictionary";

const config = {
  source: ["tokens/**/*.json"],
  platforms: {
    css: {
      transformGroup: "css",
      buildPath: "generated/css/",
      files: [
        {
          destination: "variables.css",
          format: "css/variables",
          options: {
            outputReferences: true,
          },
        },
      ],
    },
    js: {
      transformGroup: "js",
      buildPath: "generated/js/",
      files: [
        {
          destination: "tokens.ts",
          format: "typescript/module",
        },
      ],
    },
    rn: {
      transformGroup: "js",
      buildPath: "generated/rn/",
      files: [
        {
          destination: "tokens.ts",
          format: "javascript/module-flat",
        },
      ],
    },
    scss: {
      transformGroup: "scss",
      buildPath: "generated/scss/",
      files: [
        {
          destination: "_variables.scss",
          format: "scss/variables",
        },
      ],
    },
  },
};

const sd = StyleDictionary.extend(config);
sd.buildAllPlatforms();
