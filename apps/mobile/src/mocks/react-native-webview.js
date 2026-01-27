// Mock for Web
const React = require("react");
const { View, Text } = require("react-native");

module.exports = {
  WebView: (props) =>
    React.createElement(
      View,
      props,
      React.createElement(Text, null, "WebView Mock"),
    ),
  default: (props) =>
    React.createElement(
      View,
      props,
      React.createElement(Text, null, "WebView Mock"),
    ),
};
