import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./LoginPage";

jest.mock("../api", () => ({
  login: jest.fn(),
}));

import { login } from "../api";

test("renders login form", () => {
  render(<LoginPage />);
  expect(screen.getByTestId("login-form")).toBeInTheDocument();
  expect(screen.getByTestId("email-input")).toBeInTheDocument();
  expect(screen.getByTestId("password-input")).toBeInTheDocument();
});

test("shows error message on failed login", async () => {
  login.mockRejectedValueOnce(new Error("Invalid email or password"));
  render(<LoginPage />);

  fireEvent.change(screen.getByTestId("email-input"), {
    target: { value: "wrong@w.com" },
  });
  fireEvent.change(screen.getByTestId("password-input"), {
    target: { value: "wrongpass" },
  });
  fireEvent.click(screen.getByTestId("login-button"));

  await waitFor(() => {
    expect(screen.getByTestId("login-error")).toHaveTextContent(
      "Invalid email or password"
    );
  });
});

test("shows success view on valid login", async () => {
  login.mockResolvedValueOnce({
    access_token: "fake-token",
    user: { email: "guest@w.com", full_name: "Demo Guest", role: "guest" },
  });
  render(<LoginPage />);

  fireEvent.change(screen.getByTestId("email-input"), {
    target: { value: "guest@w.com" },
  });
  fireEvent.change(screen.getByTestId("password-input"), {
    target: { value: "guest" },
  });
  fireEvent.click(screen.getByTestId("login-button"));

  await waitFor(() => {
    expect(screen.getByTestId("login-success")).toBeInTheDocument();
  });
});
