import { useEffect, useMemo, useState } from "react";

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8080";

const sessionEndpoint = `${backendUrl}/api/session/join`;

const wsUrl = (token: string) => {
  const url = new URL(backendUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("token", token);
  url.searchParams.set("role", "mobile");
  return url.toString();
};

export default function App() {
  const [code, setCode] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState("Sin conexión");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const socket = useMemo(() => {
    if (!token) return null;
    return new WebSocket(wsUrl(token));
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    socket.onopen = () => setStatus("Conectado");
    socket.onclose = () => setStatus("Desconectado");
    socket.onmessage = (event) => {
      setResult(event.data);
    };

    return () => socket.close();
  }, [socket]);

  const joinSession = async () => {
    setStatus("Conectando...");
    const response = await fetch(sessionEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    if (!response.ok) {
      setStatus("Código inválido");
      return;
    }
    const data = await response.json();
    setToken(data.token);
  };

  const sendPhoto = async (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const payload = {
        type: "photo",
        payload: {
          image: reader.result,
          sentAt: Date.now()
        }
      };
      socket?.send(JSON.stringify(payload));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="app">
      <header>
        <h1>Noname</h1>
        <p>PWA para capturar fotos y enviar al PC.</p>
      </header>

      <section className="card">
        <h2>Vincular</h2>
        <label>
          Código de sesión
          <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} />
        </label>
        <button onClick={joinSession}>Conectar</button>
        <p className="status">Estado: {status}</p>
      </section>

      <section className="card">
        <h2>Enviar foto</h2>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setPreview(URL.createObjectURL(file));
            sendPhoto(file);
          }}
        />
        {preview && <img className="preview" src={preview} alt="preview" />}
        {result && <p className="result">Resultado: {result}</p>}
      </section>

      <section className="card">
        <h2>DNS sin app</h2>
        <p>Configura el DNS privado para bloquear apps distractoras.</p>
        <ol>
          <li>Android: Ajustes → Red → DNS privado.</li>
          <li>Ingresa: dns.noname.example</li>
          <li>iOS: descarga el perfil desde el dashboard del PC.</li>
        </ol>
      </section>
    </div>
  );
}
