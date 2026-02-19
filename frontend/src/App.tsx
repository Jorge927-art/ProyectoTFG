import { useState, useEffect } from 'react'

function App() {
  const [mensaje, setMensaje] = useState("Esperando al Backend...");

  useEffect(() => {
    fetch('http://localhost:8080/api/prueba')
      .then(response => {
        if (response.ok) return response.json();
        throw new Error("Error 404: Ruta no encontrada");
      })
      .then(data => setMensaje(data.mensaje)) // Si conecta, cambia el texto
      .catch(error => setMensaje("Error: " + error.message));
  }, []);

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Proyecto TFG: Conexión Full-Stack</h1>
      <div className="card">
        <p style={{ fontSize: '1.5rem', color: '#646cff' }}>
          Estado: <strong>{mensaje}</strong>
        </p>
      </div>
      <p>Java 21 + Spring Boot 3.4.2 + React/Vite</p>
    </div>
  )
}

export default App
