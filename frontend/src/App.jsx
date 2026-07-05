import LoginPage from "./pages/LoginPage";

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="brand-mark">Wayfarer</span>
      </header>
      <main>
        <LoginPage />
      </main>
    </div>
  );
}

export default App;
