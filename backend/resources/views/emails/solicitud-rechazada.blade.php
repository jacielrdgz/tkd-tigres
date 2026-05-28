<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Solicitud declinada</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 40px 20px;
    }
    .wrapper {
      max-width: 560px;
      margin: 0 auto;
    }
    .card {
      background: #1e293b;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid #334155;
    }
    .header {
      background: linear-gradient(135deg, #ef4444, #b91c1c);
      padding: 40px 32px;
      text-align: center;
    }
    .icon-circle {
      width: 64px;
      height: 64px;
      background: rgba(255,255,255,0.15);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.5px;
    }
    .body {
      padding: 32px;
    }
    .greeting {
      font-size: 16px;
      color: #e2e8f0;
      margin-bottom: 16px;
    }
    .text {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.7;
      margin-bottom: 24px;
    }
    .motivo-box {
      background: rgba(239,68,68,0.08);
      border: 1px solid rgba(239,68,68,0.2);
      border-radius: 12px;
      padding: 18px 20px;
      margin-bottom: 24px;
    }
    .motivo-title {
      font-size: 13px;
      font-weight: 800;
      color: #f87171;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .motivo-text {
      font-size: 14px;
      color: #fca5a5;
      line-height: 1.6;
      font-style: italic;
    }
    .footer {
      border-top: 1px solid #334155;
      padding: 20px 32px;
      text-align: center;
    }
    .footer p {
      font-size: 12px;
      color: #475569;
    }
    .app-name {
      font-size: 13px;
      font-weight: 700;
      color: #64748b;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="icon-circle">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
        <h1>Solicitud de Registro Declinada</h1>
      </div>

      <div class="body">
        <p class="greeting">Hola, <strong>{{ $nombre }}</strong>.</p>
        
        <p class="text">
          Lamentamos informarte que tu solicitud de registro en nuestra plataforma para tu escuela de Taekwondo ha sido declinada tras ser evaluada por nuestro equipo administrativo.
        </p>

        <div class="motivo-box">
          <div class="motivo-title">Motivo especificado:</div>
          <div class="motivo-text">"{{ $motivo }}"</div>
        </div>

        <p class="text">
          Si consideras que ha sido un error o deseas proporcionar información complementaria para una nueva evaluación, puedes ponerte en contacto directo respondiendo a este correo electrónico.
        </p>
      </div>

      <div class="footer">
        <p>Este correo fue enviado automáticamente por el sistema de administración.</p>
        <p class="app-name">{{ config('app.name') }}</p>
      </div>
    </div>
  </div>
</body>
</html>
