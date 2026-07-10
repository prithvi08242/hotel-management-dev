import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "./LoginPage";

const mockLogin = jest.fn();
const mockNavigate = jest.fn();

jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({ login: mockLogin }),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockLogin.mockReset();
  mockNavigate.mockReset();
});

test("renders the login form", () => {
  renderLoginPage();
  expect(screen.getByTestId("login-form")).toBeInTheDocument();
  expect(screen.getByTestId("email-input")).toBeInTheDocument();
  expect(screen.getByTestId("password-input")).toBeInTheDocument();
  expect(screen.getByTestId("login-button")).toBeInTheDocument();
});

test("shows a link to the signup page", () => {
  renderLoginPage();
  expect(screen.getByTestId("go-to-signup")).toBeInTheDocument();
});

test("submits credentials and navigates to /rooms on success", async () => {
  mockLogin.mockResolvedValueOnce({});
  renderLoginPage();

  fireEvent.change(screen.getByTestId("email-input"), {
    target: { value: "guest@w.com" },
  });
  fireEvent.change(screen.getByTestId("password-input"), {
    target: { value: "guest" },
  });
  fireEvent.click(screen.getByTestId("login-button"));

  await waitFor(() => {
    expect(mockLogin).toHaveBeenCalledWith("guest@w.com", "guest");
    expect(mockNavigate).toHaveBeenCalledWith("/rooms");
  });
});

test("shows an error message on failed login", async () => {
  mockLogin.mockRejectedValueOnce(new Error("Invalid email or password"));
  renderLoginPage();

  fireEvent.change(screen.getByTestId("email-input"), {
    target: { value: "guest@w.com" },
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
  expect(mockNavigate).not.toHaveBeenCalled();
});
