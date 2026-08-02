// Layout base de la aplicación: header, footer y contenedor principal.

/**
 * @param {Object} props
 * @param {import('react').ReactNode} props.children
 */
function AppShell({ children }) {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <span className="app-shell__header-title">PensionLab</span>
      </header>

      <main className="app-shell__main">{children}</main>

      <footer className="app-shell__footer">
        <p>
          PensionLab ofrece orientación informativa para comprender alternativas
          pensionales. No reemplaza la asesoría profesional ni las decisiones del
          usuario.
        </p>
      </footer>
    </div>
  )
}

export default AppShell
