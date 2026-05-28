<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Aviso de vencimiento</title>
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
      background: linear-gradient(135deg, #f59e0b, #d97706);
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
    .alert-box {
      background: rgba(245,158,11,0.08);
      border: 1px solid rgba(245,158,11,0.2);
      border-radius: 12px;
      padding: 18px 20px;
      margin-bottom: 24px;
    }
    .alert-title {
      font-size: 13px;
      font-weight: 800;
      color: #fbbf24;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .alert-text {
      font-size: 14px;
      color: #fde047;
      line-height: 1.6;
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
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <h1>Próximo Vencimiento de Suscripción</h1>
      </div>

      <div class="body">
        <p class="greeting">Hola, <strong>{{ $nombre }}</strong>.</p>
        
        <p class="text">
          Te recordamos que la suscripción para tu escuela <strong>"{{ $escuela }}"</strong> está próxima a expirar.
        </p>

        <div class="alert-box">
          <div class="alert-title">Fecha de vencimiento:</div>
          <div class="alert-text">
            <strong>{{ \Carbon\Carbon::parse($fechaVencimiento)->format('d/m/Y') }}</strong> (Faltan exactamente 7 días).
          </div>
        </div>

        <p class="text">
          Para evitar suspensiones en el servicio y que tu equipo e instructores sigan operando con normalidad, te sugerimos ponerte en contacto con el administrador general del sistema para realizar la renovación o verificar el estado de tus pagos.
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
