// Registers jest-dom matchers (e.g. toBeInTheDocument) with Vitest's `expect`.
// The matchers are only evaluated when called, so importing this in Node-env
// tests is harmless; component tests that opt into jsdom get the DOM assertions.
import '@testing-library/jest-dom/vitest'
