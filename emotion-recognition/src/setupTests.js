// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsdom has no matchMedia implementation; ThemeProvider reads it to pick the
// initial light/dark theme, which throws for any test that mounts it for real
// (e.g. rendering <App /> directly) instead of stubbing ThemeContext.
window.matchMedia =
  window.matchMedia ||
  function matchMedia() {
    return {
      matches: false,
      addListener: () => {},
      removeListener: () => {},
    };
  };
